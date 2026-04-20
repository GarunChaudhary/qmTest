import "server-only";
import axios from "axios";

const BASE_URL = (process.env.WEBEX_BASE_URL || "https://api.wxcc-us1.cisco.com").replace(/\/+$/, "");
const OAUTH_TOKEN_URL = process.env.WEBEX_OAUTH_TOKEN_URL?.trim() || "https://webexapis.com/v1/access_token";
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;

const tokenCache = globalThis.__callMonitoringWebexTokenCache || {
  accessToken: "",
  accessTokenExpiresAt: 0,
  refreshToken: "",
};

if (!globalThis.__callMonitoringWebexTokenCache) {
  globalThis.__callMonitoringWebexTokenCache = tokenCache;
}

export class WebexApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "WebexApiError";
    this.status = options.status || 500;
    this.endpoint = options.endpoint || "";
    this.details = options.details || null;
  }
}

function hasRefreshConfiguration() {
  return Boolean(
    process.env.WEBEX_CLIENT_ID?.trim() &&
      process.env.WEBEX_CLIENT_SECRET?.trim() &&
      (tokenCache.refreshToken || process.env.WEBEX_REFRESH_TOKEN?.trim())
  );
}

function getStoredAccessToken() {
  return tokenCache.accessToken || process.env.WEBEX_ACCESS_TOKEN?.trim() || "";
}

function getStoredRefreshToken() {
  return tokenCache.refreshToken || process.env.WEBEX_REFRESH_TOKEN?.trim() || "";
}

function shouldRefreshAccessToken() {
  return Boolean(
    tokenCache.accessToken &&
      tokenCache.accessTokenExpiresAt &&
      Date.now() >= tokenCache.accessTokenExpiresAt - ACCESS_TOKEN_REFRESH_SKEW_MS
  );
}

async function refreshAccessToken() {
  const clientId = process.env.WEBEX_CLIENT_ID?.trim();
  const clientSecret = process.env.WEBEX_CLIENT_SECRET?.trim();
  const refreshToken = getStoredRefreshToken();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Automatic Webex token refresh requires WEBEX_CLIENT_ID, WEBEX_CLIENT_SECRET, and WEBEX_REFRESH_TOKEN."
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await axios.post(OAUTH_TOKEN_URL, body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  tokenCache.accessToken = String(response?.data?.access_token || "").trim();
  tokenCache.refreshToken = String(response?.data?.refresh_token || refreshToken).trim();
  tokenCache.accessTokenExpiresAt = Date.now() + Number(response?.data?.expires_in || 0) * 1000;

  if (!tokenCache.accessToken) {
    throw new Error("Webex OAuth refresh succeeded but did not return an access token.");
  }

  return tokenCache.accessToken;
}

async function getHeaders() {
  let token = getStoredAccessToken();

  if ((!token || shouldRefreshAccessToken()) && hasRefreshConfiguration()) {
    token = await refreshAccessToken();
  }

  if (!token) {
    throw new Error(
      "WEBEX_ACCESS_TOKEN is not configured. Set WEBEX_ACCESS_TOKEN or configure WEBEX_REFRESH_TOKEN, WEBEX_CLIENT_ID, and WEBEX_CLIENT_SECRET."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildWebexApiError(pathname, error) {
  const status = Number(error?.response?.status || 500);
  const body = error?.response?.data;
  const messageFromBody =
    (typeof body === "string" && body.trim()) ||
    body?.message ||
    body?.error ||
    body?.errors?.[0]?.message ||
    "";

  const message =
    status === 401
      ? "Webex API rejected the request with 401 Unauthorized. Refresh or replace WEBEX_ACCESS_TOKEN, or configure WEBEX_REFRESH_TOKEN, WEBEX_CLIENT_ID, and WEBEX_CLIENT_SECRET for automatic refresh."
      : messageFromBody || error?.message || "Webex API request failed.";

  return new WebexApiError(message, {
    status,
    endpoint: pathname,
    details: body || null,
  });
}

const webexClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

const LIVE_CALLS_QUERY_FIELDS = [
  "id",
  "createdTime",
  "endedTime",
  "status",
  "channelType",
  "origin",
  "destination",
  "contactReason",
  "direction",
  "terminationType",
  "channelSubType",
  "isActive",
  "isCampaign",
  "outdialType",
  "isCallback",
  "cpaStatus",
  "recordingLocation",
  "lastQueue{id,name,duration}",
  "lastSite{id,name}",
  "lastTeam{id,name}",
  "lastEntryPoint{id,name}",
  "previousQueue{id,name}",
  "preferredAgentSystemId",
  "terminationReason",
  "firstQueueName",
  "terminatingEnd",
  "lastWrapUpCodeId",
  "lastWrapupCodeName",
  "lastAgent{id,name,signInId,sessionId,phoneNumber,channelId}",
  "abandonedSlCount",
  "agentHangupCount",
  "botName",
  "chainedInToEPCount",
  "chainedInToQueueCount",
  "flowActivityName",
  "flowActivitySequence",
  "totalDuration",
  "csatScore",
  "blindTransferCount",
  "conferenceCount",
  "conferenceDuration",
  "consultCount",
  "consultDuration",
  "holdCount",
  "holdDuration",
  "selfserviceCount",
  "selfserviceDuration",
  "connectedCount",
  "connectedDuration",
  "consultToQueueCount",
  "consultToQueueDuration",
  "transferCount",
  "wrapupDuration",
  "ringingDuration",
  "queueDuration",
  "queueCount",
  "captureRequested",
  "isTranscriptionAvailable",
  "consultToEPCount",
  "consultToEPDuration",
  "outdialConsultToEPCount",
  "outdialConsultToEPDuration",
  "agentToDnTransferCount",
  "agentToAgentTransferCount",
  "callCompletedCount",
  "autoCsat",
  "matchedSkills",
  "requiredSkills",
  "matchedSkillsProfile",
  "isWithInServiceLevel",
  "isContactOffered",
  "transferErrorCount",
  "isContactEscalatedToQueue",
  "isOptOutOfQueue",
  "isContactHandled",
  "outdialConsultToQueueCount",
  "outdialConsultCount",
  "overflowCount",
  "pausedCount",
  "pausedDuration",
  "previousAgentId",
  "previousAgentSessionId",
  "previousAgentName",
  "queueTransferToEPCount",
  "queueTransferToQueueCount",
  "recordingFileSize",
  "recordingCount",
  "recordingErrorCount",
  "resumedCount",
  "shortInIVRCount",
  "shortInQueueCount",
  "silentMonitoringCount",
  "recordingStereoBlobId",
  "suddenDisconnectCount",
  "totalMonitoringCount",
  "outdialConsultToQueueDuration",
  "transferInToEPCount",
  "isOutdial",
  "monitoringTimestamp",
  "isRecordingDeleted",
  "isMonitored",
  "monitorFullName",
  "isBarged",
  "bargedInDuration",
  "bargedInCount",
  "bargedInFailedCount",
  "preferredAgentName",
  "agentTransferedInCount",
  "agentToEntrypointTransferCount",
  "agentToQueueTransferCount",
  "totalBnrDuration",
  "lastActivityTime",
  "customer{name,phoneNumber,email}",
  "channelMetaData{email{subject}}",
  "channelMetaData{chat{chatReason}}",
  "callbackData{callbackRequestTime,callbackConnectTime,callbackNumber,callbackStatus,callbackOrigin,callbackType,callbackQueueName,callbackAgentName,callbackTeamName,callbackRetryCount}",
  "feedback{surveyOptIn,type,questionsAnswered,surveyCompleted,questionsPresented,comment}",
];

const RECORDING_TASK_QUERY_FIELDS = [
  "id",
  "createdTime",
  "endedTime",
  "status",
  "isActive",
  "lastAgent{id,name,signInId,sessionId,phoneNumber,channelId}",
  "lastQueue{id,name,duration}",
  "customer{name,phoneNumber,email}",
];

function getOrgId() {
  const explicitOrgId = process.env.WEBEX_ORG_ID?.trim();
  if (explicitOrgId) {
    return explicitOrgId;
  }

  const token = getStoredAccessToken();
  const parts = token.split("_").filter(Boolean);
  const candidate = parts[parts.length - 1] || "";

  return /^[0-9a-fA-F-]{36}$/.test(candidate) ? candidate : "";
}

async function getRequest(pathname, options = {}) {
  try {
    const response = await webexClient.get(pathname, {
      headers: await getHeaders(),
      ...options,
    });

    return response.data;
  } catch (error) {
    if (Number(error?.response?.status || 0) === 401 && hasRefreshConfiguration()) {
      try {
        await refreshAccessToken();

        const retryResponse = await webexClient.get(pathname, {
          headers: await getHeaders(),
          ...options,
        });

        return retryResponse.data;
      } catch (retryError) {
        throw buildWebexApiError(pathname, retryError);
      }
    }

    throw buildWebexApiError(pathname, error);
  }
}

async function postRequest(pathname, data, options = {}) {
  try {
    const response = await webexClient.post(pathname, data, {
      headers: await getHeaders(),
      ...options,
    });

    return response.data;
  } catch (error) {
    if (Number(error?.response?.status || 0) === 401 && hasRefreshConfiguration()) {
      try {
        await refreshAccessToken();

        const retryResponse = await webexClient.post(pathname, data, {
          headers: await getHeaders(),
          ...options,
        });

        return retryResponse.data;
      } catch (retryError) {
        throw buildWebexApiError(pathname, retryError);
      }
    }

    throw buildWebexApiError(pathname, error);
  }
}

async function executeTaskSearch(fields, { from, to }) {
  const orgId = getOrgId();

  if (!orgId) {
    throw new WebexApiError(
      "Unable to derive Webex orgId from WEBEX_ACCESS_TOKEN. Set WEBEX_ORG_ID in your environment.",
      { status: 500, endpoint: "/search" }
    );
  }

  const query = `{taskDetails(from: ${from},to: ${to}) {tasks {${fields.join(",")}}}}`;
  const data = await postRequest(`/search?orgId=${encodeURIComponent(orgId)}`, { query });

  return data?.data?.taskDetails?.tasks || [];
}

function logWebexError(scope, error) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unknown Webex API error";

  console.error(`[call-monitoring][${scope}] ${message}`);
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function getActiveCalls() {
  try {
    const to = Date.now();
    const from = to - 4 * 60 * 60 * 1000;
    return await executeTaskSearch(LIVE_CALLS_QUERY_FIELDS, { from, to });
  } catch (error) {
    logWebexError("getActiveCalls", error);
    throw error;
  }
}

export async function getAgents() {
  try {
    const to = Date.now();
    const from = to - 6 * 60 * 60 * 1000;

    return await getRequest("/v1/agents/statistics", {
      params: {
        from,
        to,
      },
    });
  } catch (error) {
    logWebexError("getAgents", error);
    throw error;
  }
}

export async function getCallDetails(callId) {
  if (!callId) {
    return null;
  }

  try {
    return await getRequest(`/v1/calls/${encodeURIComponent(callId)}`);
  } catch (error) {
    logWebexError("getCallDetails", error);
    throw error;
  }
}

export async function getRecordings() {
  try {
    const to = Date.now();
    const from = to - 24 * 60 * 60 * 1000;
    const tasks = await executeTaskSearch(RECORDING_TASK_QUERY_FIELDS, { from, to });
    const taskIds = tasks.map((task) => task?.id).filter(Boolean);
    const orgId = getOrgId();

    if (!taskIds.length) {
      return [];
    }

    if (!orgId) {
      throw new WebexApiError(
        "Unable to derive Webex orgId from WEBEX_ACCESS_TOKEN. Set WEBEX_ORG_ID in your environment.",
        { status: 500, endpoint: "/v1/captures/query" }
      );
    }

    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const captureGroups = chunkArray(taskIds, 10);
    const captureResponses = await Promise.all(
      captureGroups.map((taskIdGroup) =>
        postRequest("/v1/captures/query", {
          query: {
            orgId,
            taskIds: taskIdGroup,
            urlExpiration: 60,
            includeSegments: false,
          },
        })
      )
    );
    const captures = captureResponses.flatMap((response) =>
      Array.isArray(response?.data) ? response.data : []
    );

    return captures.flatMap((capture) => {
      const task = taskMap.get(capture?.taskId) || {};
      const recordings = Array.isArray(capture?.recording) ? capture.recording : [];
      const transcriptions = Array.isArray(capture?.transcription) ? capture.transcription : [];

      return recordings.map((recordingItem) => ({
        taskId: capture?.taskId || task?.id || "",
        recordingId: recordingItem?.id || "",
        playbackUrl: recordingItem?.attributes?.filePath || "",
        fileName: recordingItem?.attributes?.fileName || "",
        startTime: recordingItem?.attributes?.startTime || task?.createdTime || null,
        stopTime: recordingItem?.attributes?.stopTime || task?.endedTime || null,
        participants: recordingItem?.attributes?.participants || [],
        callType: recordingItem?.attributes?.callType || "",
        agentName: task?.lastAgent?.name || "",
        queueName: task?.lastQueue?.name || "",
        customerName: task?.customer?.name || "",
        transcriptUrl: transcriptions[0]?.filePath || "",
        transcriptFileName: transcriptions[0]?.fileName || "",
      }));
    });
  } catch (error) {
    logWebexError("getRecordings", error);
    throw error;
  }
}
