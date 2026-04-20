"use client";

let desktopSdkInitPromise = null;
let desktopSdkModulePromise = null;
const DESKTOP_ONLY_ERROR = "Monitoring works only inside Webex Contact Center Desktop";

function getWidgetRequestHeaders() {
  const widgetKey = process.env.NEXT_PUBLIC_CALL_MONITORING_WIDGET_KEY;

  if (!widgetKey) {
    return {};
  }

  return {
    "x-call-monitoring-widget-key": widgetKey,
  };
}

function normalizeMonitoringRequest(callId, monitoringRequest = null) {
  const normalizedCallId = String(callId || monitoringRequest?.taskId || monitoringRequest?.callId || "").trim();
  const requestId = String(monitoringRequest?.id || monitoringRequest?.requestId || normalizedCallId).trim();
  const trackingId = String(monitoringRequest?.trackingId || requestId || normalizedCallId).trim();
  const monitorType = String(monitoringRequest?.monitorType || "midcall").trim().toLowerCase() || "midcall";

  return {
    callId: normalizedCallId,
    requestId,
    trackingId,
    monitorType,
    createdAt: Date.now(),
  };
}

export function consumePendingMonitoringRequest() {
  return null;
}

async function loadDesktopSdk() {
  if (typeof window === "undefined") {
    return null;
  }

  const runtimeDesktop = window.Desktop || window.parent?.Desktop;

  if (runtimeDesktop) {
    return runtimeDesktop;
  }

  if (!desktopSdkModulePromise) {
    desktopSdkModulePromise = import("@wxcc-desktop/sdk")
      .then((module) => module?.Desktop || null)
      .catch(() => null);
  }

  return desktopSdkModulePromise;
}

export function hasWebexDesktopContext() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.Desktop || window.parent?.Desktop);
}

export async function getMonitoringDesktop() {
  return loadDesktopSdk();
}

export async function startMonitoring(callId, monitoringRequest = null) {
  const normalizedRequest = normalizeMonitoringRequest(callId, monitoringRequest);

  if (!normalizedRequest.callId) {
    throw new Error("Invalid callId");
  }

  if (!hasWebexDesktopContext()) {
    throw new Error(DESKTOP_ONLY_ERROR);
  }

  const Desktop = await loadDesktopSdk();

  if (!Desktop?.config?.init || !Desktop?.monitoring?.startMonitoring) {
    throw new Error(DESKTOP_ONLY_ERROR);
  }

  if (!desktopSdkInitPromise) {
    desktopSdkInitPromise = Desktop.config.init({
      widgetName: "Call Monitoring",
      widgetProvider: "QM NEW",
    });
  }

  try {
    await desktopSdkInitPromise;
  } catch (error) {
    desktopSdkInitPromise = null;
    throw error;
  }

  const response = await fetch("/api/start-monitoring", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...getWidgetRequestHeaders(),
    },
    body: JSON.stringify({
      callId: normalizedRequest.callId,
      requestId: normalizedRequest.requestId,
      trackingId: normalizedRequest.trackingId,
      monitorType: normalizedRequest.monitorType,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("[call-monitoring] Backend monitoring preparation failed", {
      callId: normalizedRequest.callId,
      status: response.status,
      payload,
    });
    throw new Error(payload?.message || `Monitoring request failed with ${response.status}`);
  }

  const preparedMonitoringRequest = payload?.monitoringRequest;

  if (!preparedMonitoringRequest?.id || !preparedMonitoringRequest?.taskId || !preparedMonitoringRequest?.trackingId) {
    throw new Error("Cisco monitoring payload is incomplete.");
  }

  console.info("[call-monitoring] Requesting Cisco monitoring", preparedMonitoringRequest);

  await Desktop.monitoring.startMonitoring(preparedMonitoringRequest);

  console.info("[call-monitoring] Cisco monitoring request submitted", {
    callId: preparedMonitoringRequest.taskId,
    trackingId: preparedMonitoringRequest.trackingId,
  });

  return {
    mode: "wxcc-desktop",
    interactionId: preparedMonitoringRequest.taskId,
    monitoringRequest: preparedMonitoringRequest,
    call: payload?.call || null,
  };
}
