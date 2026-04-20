import { NextResponse } from "next/server";

import { requireCallMonitoringSession } from "@/modules/call-monitoring/services/authService";
import { buildStartMonitoringPayload } from "@/modules/call-monitoring/services/callMonitoringService";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireCallMonitoringSession(request);
  if (auth.error) return auth.error;

  let body = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const callId = String(body?.callId || body?.taskId || body?.interactionId || "").trim();
  const requestId = String(body?.requestId || body?.id || "").trim();
  const trackingId = String(body?.trackingId || "").trim();
  const monitorType = String(body?.monitorType || "midcall").trim().toLowerCase();

  if (!callId) {
    return NextResponse.json({ message: "callId is required." }, { status: 400 });
  }

  if (!requestId) {
    return NextResponse.json({ message: "requestId is required." }, { status: 400 });
  }

  if (!trackingId) {
    return NextResponse.json({ message: "trackingId is required." }, { status: 400 });
  }

  try {
    console.info("[call-monitoring][api/start-monitoring] Preparing monitoring request", {
      callId,
      requestId,
      trackingId,
      monitorType,
    });

    const payload = await buildStartMonitoringPayload({
      callId,
      requestId,
      trackingId,
      monitorType,
    });

    console.info("[call-monitoring][api/start-monitoring] Monitoring request ready", {
      callId: payload?.monitoringRequest?.taskId || callId,
      trackingId: payload?.monitoringRequest?.trackingId || trackingId,
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[call-monitoring][api/start-monitoring] Monitoring request failed", {
      callId,
      requestId,
      trackingId,
      monitorType,
      message: error?.message || "Unknown monitoring error",
      upstreamStatus: error?.status || 500,
      endpoint: error?.endpoint || "",
    });

    return NextResponse.json(
      {
        message: error?.message || "Unable to prepare Cisco monitoring request.",
        upstreamStatus: error?.status || 500,
        endpoint: error?.endpoint || "",
      },
      { status: error?.status || 502 }
    );
  }
}
