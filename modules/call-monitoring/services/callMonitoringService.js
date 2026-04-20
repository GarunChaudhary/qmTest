import "server-only";

import {
  getActiveCalls,
  getAgents,
  getCallDetails,
  getRecordings,
} from "@/modules/call-monitoring/services/webexService";

const KEYWORDS = ["angry", "cancel", "complaint"];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.calls)) return value.calls;
  if (Array.isArray(value?.data?.calls)) return value.data.calls;
  if (Array.isArray(value?.agents)) return value.agents;
  if (Array.isArray(value?.data?.agents)) return value.data.agents;
  if (Array.isArray(value?.recordings)) return value.recordings;
  if (Array.isArray(value?.data?.recordings)) return value.data.recordings;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function pickValue(source, paths, fallback = null) {
  for (const path of paths) {
    const segments = path.split(".");
    let current = source;

    for (const segment of segments) {
      current = current?.[segment];
    }

    if (current !== undefined && current !== null && current !== "") {
      return current;
    }
  }

  return fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoString(value) {
  if (!value) return null;

  const numeric = Number(value);
  const date =
    Number.isFinite(numeric) && String(value).length >= 10
      ? new Date(numeric)
      : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toStatusText(value) {
  return String(value || "Unknown").trim();
}

function isActiveStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return ["active", "connected", "inprogress", "engaged", "monitoring", "talking"].some((token) =>
    normalized.includes(token)
  );
}

function extractDurationSeconds(raw) {
  return toNumber(
    pickValue(raw, [
      "durationSeconds",
      "duration",
      "totalDuration",
      "connectedDuration",
      "talkDuration",
      "elapsedTime",
    ]),
    0
  );
}

function extractTextSignals(raw) {
  const textFields = [
    pickValue(raw, ["transcript", "summary", "notes", "reason", "statusReason"], ""),
    pickValue(raw, ["customer.name", "customer.email"], ""),
    pickValue(raw, ["queueName", "queue.name"], ""),
  ];

  return textFields.join(" ").toLowerCase();
}

function buildKeywordMatches(raw) {
  const text = extractTextSignals(raw);
  return KEYWORDS.filter((keyword) => text.includes(keyword));
}

function buildAgentBuddy(call) {
  const suggestions = [];

  if (call.keywordAlerts.includes("angry") || call.keywordAlerts.includes("complaint")) {
    suggestions.push("Handle politely");
  }

  if (call.keywordAlerts.includes("cancel") || call.durationSeconds >= 600) {
    suggestions.push("Escalate if needed");
  }

  if (!suggestions.length && isActiveStatus(call.status)) {
    suggestions.push("Confirm issue details clearly");
  }

  return suggestions;
}

function scoreCall(durationSeconds) {
  if (durationSeconds <= 180) return 95;
  if (durationSeconds <= 480) return 84;
  if (durationSeconds <= 900) return 72;
  return 60;
}

function normalizeCall(raw) {
  const callId = String(
    pickValue(raw, ["callId", "id", "interactionId", "taskId"], "")
  ).trim();
  const status = toStatusText(pickValue(raw, ["status", "state", "callStatus"], "Unknown"));
  const durationSeconds = extractDurationSeconds(raw);
  const keywordAlerts = buildKeywordMatches(raw);
  const agentName = String(
    pickValue(
      raw,
      ["agentName", "agent.name", "lastAgent.name", "ownerName", "assignedTo"],
      "Unassigned"
    )
  ).trim();
  const agentId = String(pickValue(raw, ["agentId", "agent.id", "lastAgent.id", "ownerId"], "")).trim();
  const channelType = String(pickValue(raw, ["channelType"], "Unknown")).trim();
  const connectedCount = toNumber(pickValue(raw, ["connectedCount"]), 0);
  const connectedDuration = toNumber(pickValue(raw, ["connectedDuration"]), 0);
  const isAssignedAgent = Boolean(agentId) || (agentName && agentName.toLowerCase() !== "unassigned");
  const isTelephony = channelType.toLowerCase() === "telephony";
  const canMonitor =
    isTelephony &&
    isAssignedAgent &&
    (isActiveStatus(status) || connectedCount > 0 || connectedDuration > 0 || durationSeconds > 0);

  return {
    callId,
    agent: agentName,
    agentId,
    status,
    durationSeconds,
    startedAt: toIsoString(
      pickValue(raw, ["startTime", "createdTime", "createdAt", "connectedAt", "startTimestamp"])
    ),
    queue: String(pickValue(raw, ["queueName", "queue.name", "lastQueue.name"], "Unknown")).trim(),
    direction: String(pickValue(raw, ["direction", "callDirection"], "Unknown")).trim(),
    customer: String(
      pickValue(raw, ["customer.name", "customerNumber", "ani", "phoneNumber"], "Unknown")
    ).trim(),
    isActive: Boolean(pickValue(raw, ["isActive"], false)),
    origin: String(pickValue(raw, ["origin", "ani"], "")).trim(),
    destination: String(pickValue(raw, ["destination"], "")).trim(),
    channelType,
    connectedCount,
    connectedDuration,
    canMonitor,
    keywordAlerts,
    agentBuddy: buildAgentBuddy({ keywordAlerts, durationSeconds, status }),
    score: scoreCall(durationSeconds),
    raw,
  };
}

function normalizeAgent(raw) {
  const channels = Array.isArray(raw?.channels) ? raw.channels : [];
  const totalAvailableTime = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalAvailableTime, 0),
    0
  );
  const totalUnavailableTime = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalUnAvailableTime, 0),
    0
  );
  const totalEngagedDuration = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalEngagedDuration, 0),
    0
  );
  const totalAcceptedTasks = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalAcceptedTasks, 0),
    0
  );
  const totalOfferedTasks = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalOfferedTasks, 0),
    0
  );
  const totalHoldDuration = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalHoldDuration, 0),
    0
  );
  const totalWrapUpDuration = channels.reduce(
    (sum, channel) => sum + toNumber(channel?.totalWrapUpDuration, 0),
    0
  );
  const status = toStatusText(
    pickValue(
      raw,
      ["subStatus", "status", "state", "availability", "agentStatus"],
      totalEngagedDuration > 0 || totalAcceptedTasks > 0
        ? "On Contact"
        : totalAvailableTime > 0
          ? "Available"
          : totalUnavailableTime > 0 || totalOfferedTasks > 0
            ? "Logged In"
            : "Unknown"
    )
  );

  return {
    agentId: String(pickValue(raw, ["agentId", "id"], "")).trim(),
    name: String(pickValue(raw, ["agentName", "name", "fullName"], "Unknown")).trim(),
    status,
    extension: String(pickValue(raw, ["extension", "extensionNumber"], "")).trim(),
    team: String(pickValue(raw, ["teamName", "team.name"], "Unassigned")).trim(),
    active:
      isActiveStatus(status) ||
      totalAvailableTime > 0 ||
      totalUnavailableTime > 0 ||
      totalEngagedDuration > 0 ||
      totalAcceptedTasks > 0 ||
      totalOfferedTasks > 0,
    lastIntervalStart: toIsoString(pickValue(raw, ["intervalStartTime"])),
    totalAvailableTime,
    totalUnavailableTime,
    totalEngagedDuration,
    totalAcceptedTasks,
    totalOfferedTasks,
    totalHoldDuration,
    totalWrapUpDuration,
    channels,
    raw,
  };
}

function buildAgentLookupKeys(agent) {
  return [
    String(agent?.agentId || "").trim().toLowerCase(),
    String(agent?.name || "").trim().toLowerCase(),
  ].filter(Boolean);
}

function buildCallLookupKeys(call) {
  return [
    String(call?.agentId || "").trim().toLowerCase(),
    String(call?.agent || "").trim().toLowerCase(),
  ].filter(Boolean);
}

function deriveAgentScenario(agent, relatedCalls) {
  const activeCalls = relatedCalls.filter((call) => isActiveStatus(call.status) || call.isActive);
  const anyHoldCall = activeCalls.some((call) => String(call.status || "").toLowerCase().includes("hold"));

  if (activeCalls.length) {
    return anyHoldCall ? "Call On Hold" : "Busy On Call";
  }

  if (agent.totalAvailableTime > 0) {
    return "Available";
  }

  if (agent.totalWrapUpDuration > 0 && agent.totalAcceptedTasks > 0) {
    return "Available";
  }

  if (agent.totalEngagedDuration > 0 || agent.totalAcceptedTasks > 0) {
    return "Busy";
  }

  if (agent.totalOfferedTasks > 0 || agent.totalUnavailableTime > 0) {
    return "Logged In";
  }

  return agent.status || "Unknown";
}

function normalizeRecording(raw) {
  const startTime = pickValue(raw, ["createdAt", "startTime", "createdTime"]);
  const stopTime = pickValue(raw, ["stopTime"]);
  const startMs = Number(startTime || 0);
  const stopMs = Number(stopTime || 0);
  const durationSeconds =
    Number.isFinite(startMs) && Number.isFinite(stopMs) && stopMs > startMs
      ? Math.round((stopMs - startMs) / 1000)
      : 0;
  const transcriptUrl = String(pickValue(raw, ["transcriptUrl"], "")).trim();

  return {
    recordingId: String(pickValue(raw, ["recordingId", "id"], "")).trim(),
    callId: String(pickValue(raw, ["callId", "interactionId", "taskId"], "")).trim(),
    agent: String(pickValue(raw, ["agentName", "agent.name"], "Unknown")).trim(),
    queue: String(pickValue(raw, ["queueName"], "Unknown")).trim(),
    status: "Completed",
    durationSeconds,
    score: durationSeconds > 0 ? scoreCall(durationSeconds) : transcriptUrl ? 88 : 80,
    createdAt: toIsoString(startTime),
    playbackUrl: String(
      pickValue(raw, ["playbackUrl", "streamUrl", "url", "mediaUrl"], "")
    ).trim(),
    downloadUrl: String(
      pickValue(raw, ["downloadUrl", "playbackUrl", "streamUrl", "url", "mediaUrl"], "")
    ).trim(),
    transcriptUrl,
    transcriptFileName: String(pickValue(raw, ["transcriptFileName"], "")).trim(),
    raw,
  };
}

function createAgentFromLiveCall(call) {
  const agentName = String(call?.agent || "").trim();
  const agentId = String(call?.agentId || "").trim();

  if (!agentName || agentName.toLowerCase() === "unassigned") {
    return null;
  }

  return {
    agentId,
    name: agentName,
    status: isActiveStatus(call?.status) || call?.isActive ? "Busy On Call" : toStatusText(call?.status),
    extension: "",
    team: String(call?.queue || "Unassigned").trim(),
    active: true,
    lastIntervalStart: call?.startedAt || null,
    totalAvailableTime: 0,
    totalUnavailableTime: 0,
    totalEngagedDuration: toNumber(call?.durationSeconds, 0),
    totalAcceptedTasks: 1,
    totalOfferedTasks: 0,
    totalHoldDuration: 0,
    totalWrapUpDuration: 0,
    channels: [],
    raw: {
      source: "live-call",
      callId: call?.callId || "",
    },
  };
}

export async function getLiveCallsData() {
  return asArray(await getActiveCalls())
    .map(normalizeCall)
    .filter((call) => call.callId)
    .filter((call) => call.isActive || isActiveStatus(call.status))
    .sort((left, right) => {
      const leftTime = new Date(left.startedAt || 0).getTime();
      const rightTime = new Date(right.startedAt || 0).getTime();
      return rightTime - leftTime;
    });
}

export async function getAgentsData() {
  const [agentResponse, liveCalls] = await Promise.all([getAgents(), getLiveCallsData()]);

  const rows = asArray(agentResponse)
    .map(normalizeAgent)
    .filter((agent) => agent.agentId || agent.name !== "Unknown");

  const latestByAgent = new Map();

  for (const agent of rows) {
    const key = agent.agentId || agent.name;
    const existing = latestByAgent.get(key);
    const currentTime = new Date(agent.lastIntervalStart || 0).getTime();
    const existingTime = new Date(existing?.lastIntervalStart || 0).getTime();
    const currentSignal =
      agent.totalEngagedDuration +
      agent.totalAcceptedTasks +
      agent.totalOfferedTasks +
      agent.totalAvailableTime +
      agent.totalUnavailableTime;
    const existingSignal =
      toNumber(existing?.totalEngagedDuration, 0) +
      toNumber(existing?.totalAcceptedTasks, 0) +
      toNumber(existing?.totalOfferedTasks, 0) +
      toNumber(existing?.totalAvailableTime, 0) +
      toNumber(existing?.totalUnavailableTime, 0);

    if (
      !existing ||
      currentSignal > existingSignal ||
      (currentSignal === existingSignal && currentTime >= existingTime)
    ) {
      latestByAgent.set(key, agent);
    }
  }

  const liveCallsByAgent = new Map();

  liveCalls.forEach((call) => {
    buildCallLookupKeys(call).forEach((key) => {
      const current = liveCallsByAgent.get(key) || [];
      current.push(call);
      liveCallsByAgent.set(key, current);
    });

    const derivedAgent = createAgentFromLiveCall(call);
    if (!derivedAgent) {
      return;
    }

    const keys = buildAgentLookupKeys(derivedAgent);
    const alreadyKnown = keys.some((key) => latestByAgent.has(key));

    if (!alreadyKnown) {
      latestByAgent.set(derivedAgent.agentId || derivedAgent.name, derivedAgent);
    }
  });

  return Array.from(latestByAgent.values())
    .map((agent) => {
      const relatedCalls = buildAgentLookupKeys(agent).flatMap((key) => liveCallsByAgent.get(key) || []);
      const uniqueCalls = Array.from(new Map(relatedCalls.map((call) => [call.callId, call])).values());
      const scenarioStatus = deriveAgentScenario(agent, uniqueCalls);

      return {
        ...agent,
        status: scenarioStatus,
        active:
          scenarioStatus !== "Unknown" ||
          agent.active ||
          uniqueCalls.length > 0,
        currentCallCount: uniqueCalls.length,
        currentCallQueue: uniqueCalls[0]?.queue || "",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCallDetailsData(callId) {
  const details = await getCallDetails(callId);
  return details ? normalizeCall(details) : null;
}

async function resolveMonitorableCall(callId) {
  const normalizedCallId = String(callId || "").trim();

  if (!normalizedCallId) {
    return null;
  }

  try {
    const details = await getCallDetailsData(normalizedCallId);

    if (details?.callId) {
      return details;
    }
  } catch (error) {
    if (Number(error?.status || 0) !== 404) {
      throw error;
    }
  }

  const liveCalls = await getLiveCallsData();
  return liveCalls.find((call) => call.callId === normalizedCallId) || null;
}

export async function buildStartMonitoringPayload({
  callId,
  requestId,
  trackingId,
  monitorType = "midcall",
}) {
  const normalizedCallId = String(callId || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedTrackingId = String(trackingId || "").trim();
  const supportedMonitorTypes = new Set(["adhoc", "continuous", "midcall"]);
  const normalizedMonitorType = supportedMonitorTypes.has(String(monitorType || "").toLowerCase())
    ? String(monitorType).toLowerCase()
    : "midcall";

  if (!normalizedCallId || !normalizedRequestId || !normalizedTrackingId) {
    throw new Error("callId, requestId, and trackingId are required to prepare monitoring.");
  }

  const call = await resolveMonitorableCall(normalizedCallId);

  if (!call) {
    const error = new Error("Live call not found in Webex Contact Center.");
    error.status = 404;
    error.endpoint = `/v1/calls/${encodeURIComponent(normalizedCallId)}`;
    throw error;
  }

  if (!call.canMonitor) {
    const error = new Error("This live call is not currently eligible for Cisco monitoring.");
    error.status = 409;
    error.endpoint = `/v1/calls/${encodeURIComponent(normalizedCallId)}`;
    throw error;
  }

  return {
    monitoringRequest: {
      id: normalizedRequestId,
      monitorType: normalizedMonitorType,
      taskId: call.callId,
      trackingId: normalizedTrackingId,
    },
    call: {
      callId: call.callId,
      agentId: call.agentId,
      agentName: call.agent,
      queue: call.queue,
      status: call.status,
      direction: call.direction,
      customer: call.customer,
    },
  };
}

export async function getRecordingsData() {
  return asArray(await getRecordings())
    .map(normalizeRecording)
    .filter((recording) => recording.recordingId || recording.playbackUrl);
}

export function getAnalyticsData(calls = []) {
  const totalCalls = calls.length;
  const activeCalls = calls.filter((call) => isActiveStatus(call.status)).length;
  const averageDurationSeconds = totalCalls
    ? Math.round(calls.reduce((sum, call) => sum + call.durationSeconds, 0) / totalCalls)
    : 0;

  const keywordSummary = KEYWORDS.reduce((summary, keyword) => {
    summary[keyword] = calls.filter((call) => call.keywordAlerts.includes(keyword)).length;
    return summary;
  }, {});

  return {
    totalCalls,
    activeCalls,
    averageDurationSeconds,
    keywordSummary,
    topSuggestions: Array.from(new Set(calls.flatMap((call) => call.agentBuddy))),
  };
}
