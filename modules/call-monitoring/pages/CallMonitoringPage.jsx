"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CryptoJS from "crypto-js";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import withAuth from "@/components/withAuth";
import { MonitoringDrawer } from "@/components/call-monitoring/MonitoringDrawer";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveDuration } from "@/modules/call-monitoring/components/LiveDuration";
import { MonitoringPageLayout } from "@/modules/call-monitoring/components/MonitoringPageLayout";
import { MonitoringStats } from "@/modules/call-monitoring/components/MonitoringStats";
import { usePollingResource } from "@/modules/call-monitoring/components/usePollingResource";
import {
  getMonitoringDesktop,
  hasWebexDesktopContext,
  startMonitoring as startDesktopMonitoring,
} from "@/modules/call-monitoring/services/monitorHandler";

const TAB_VALUES = ["live-calls", "agents", "recordings", "analytics"];
const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function getSafeTab(tab) {
  return TAB_VALUES.includes(tab) ? tab : "live-calls";
}

function TabRefreshButton({ onClick }) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      Refresh now
    </Button>
  );
}

function MonitoringJoinOverlay({ session, stage }) {
  if (!session || !stage) {
    return null;
  }

  const stageContent = {
    adding: {
      badge: "Monitoring Requested",
      title: "Monitoring requested...",
      description: `Creating a real Cisco monitoring request for ${session.agentName}.`,
    },
    connecting: {
      badge: "Waiting For Answer",
      title: "Waiting for supervisor to answer...",
      description: "Cisco has offered the monitoring leg to the supervisor device or Webex App.",
    },
    connected: {
      badge: "Monitoring Started",
      title: "Monitoring started",
      description: "Silent monitoring is active. Opening the monitoring panel now.",
    },
  };

  const content = stageContent[stage] || stageContent.adding;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary">
              {content.badge}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">{content.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{content.description}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-muted/50 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Call</span>
            <span className="font-medium text-foreground">{session.sessionId}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Agent</span>
            <span className="font-medium text-foreground">{session.agentName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function isActiveStatus(status) {
  return ["active", "connected", "inprogress", "engaged"].some((token) =>
    String(status || "").toLowerCase().includes(token)
  );
}

function buildMonitorRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `monitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addMonitoringListener(monitoring, eventName, handler) {
  if (typeof monitoring?.on === "function") {
    monitoring.on(eventName, handler);
    return () => {
      monitoring.off?.(eventName, handler);
      monitoring.removeListener?.(eventName, handler);
      monitoring.removeEventListener?.(eventName, handler);
    };
  }

  if (typeof monitoring?.addEventListener === "function") {
    monitoring.addEventListener(eventName, handler);
    return () => monitoring.removeEventListener?.(eventName, handler);
  }

  throw new Error("Monitoring works only inside Webex Contact Center Desktop");
}

function extractMonitoringInteractionId(message, fallbackCallId) {
  return (
    message?.data?.interactionId ||
    message?.data?.interaction?.interactionId ||
    message?.data?.taskId ||
    fallbackCallId ||
    ""
  );
}

function getAgentStatusStyles(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("busy") || normalized.includes("contact") || normalized.includes("hold")) {
    return "bg-amber-100 text-amber-900";
  }

  if (normalized.includes("available")) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (normalized.includes("logged")) {
    return "bg-sky-100 text-sky-800";
  }

  return "bg-muted text-foreground";
}

function durationLabel(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function buildAnalyticsViewModel(calls, recordings) {
  const unifiedCallMap = new Map();

  calls.forEach((call) => {
    unifiedCallMap.set(call.callId, {
      ...call,
      source: "live",
      createdAt: call.startedAt || null,
    });
  });

  recordings.forEach((recording) => {
    const key = recording.callId || recording.recordingId;
    if (!key || unifiedCallMap.has(key)) {
      return;
    }

    unifiedCallMap.set(key, {
      callId: recording.callId || recording.recordingId,
      agent: recording.agent,
      queue: recording.queue || "Unknown",
      status: recording.status || "Completed",
      durationSeconds: recording.durationSeconds || 0,
      keywordAlerts: [],
      agentBuddy: recording.transcriptUrl
        ? ["Review transcript and close politely"]
        : ["Review recording summary with the agent"],
      score: recording.score || 80,
      createdAt: recording.createdAt || null,
      source: "recording",
      transcriptUrl: recording.transcriptUrl || "",
    });
  });

  const unifiedCalls = Array.from(unifiedCallMap.values());

  const queueData = Object.entries(
    unifiedCalls.reduce((accumulator, call) => {
      const key = call.queue || "Unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const statusData = Object.entries(
    unifiedCalls.reduce((accumulator, call) => {
      const key = call.status || "Unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const scoreData = unifiedCalls
    .slice()
    .sort((left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime())
    .slice(-10)
    .map((call) => ({
    name: call.callId.slice(0, 6),
    score: call.score,
    duration: call.durationSeconds,
  }));

  const negativeCalls = unifiedCalls.filter((call) => call.keywordAlerts.length > 0);
  const longCalls = unifiedCalls.filter((call) => Number(call.durationSeconds || 0) >= 120);
  const missingAgentCalls = unifiedCalls.filter((call) => call.agent === "Unassigned");
  const transcriptCoverage = recordings.filter((recording) => recording.transcriptUrl).length;
  const busiestQueue = [...queueData].sort((a, b) => b.value - a.value)[0] || null;

  const alerts = [
    ...negativeCalls.map((call) => ({
      id: `negative-${call.callId}`,
      label: `Keyword alert on ${call.callId.slice(0, 8)}`,
      detail: `${call.keywordAlerts.join(", ")} detected during live monitoring.`,
      severity: "high",
    })),
    ...longCalls.map((call) => ({
      id: `long-${call.callId}`,
      label: `Long call detected`,
      detail: `${call.callId.slice(0, 8)} is running for ${durationLabel(call.durationSeconds)}.`,
      severity: "medium",
    })),
    ...missingAgentCalls.map((call) => ({
      id: `assignment-${call.callId}`,
      label: `Agent assignment pending`,
      detail: `${call.callId.slice(0, 8)} is still unassigned in the feed.`,
      severity: "medium",
    })),
  ].slice(0, 6);

  const aiInsights = [
    {
      title: "Sentiment Watch",
      value: negativeCalls.length ? "Negative trend detected" : "Stable",
      detail: negativeCalls.length
        ? `${negativeCalls.length} live call(s) include risk keywords.`
        : unifiedCalls.length
          ? "No risky keywords found in the monitored calls."
          : "No risky keywords found in the current live calls.",
    },
    {
      title: "Queue Pressure",
      value: busiestQueue ? busiestQueue.name : "No active queues",
      detail: busiestQueue
        ? `${busiestQueue.value} active call(s) in the busiest queue.`
        : "No queue pressure right now.",
    },
    {
      title: "Transcript Coverage",
      value: `${transcriptCoverage}/${recordings.length || 0}`,
      detail: "Recordings with transcript files available from Cisco captures.",
    },
    {
      title: "Handled Calls",
      value: unifiedCalls.filter((call) => !isActiveStatus(call.status)).length,
      detail: "Completed call sessions visible through recordings and transcripts.",
    },
  ];

  return {
    unifiedCalls,
    queueData,
    statusData,
    scoreData,
    alerts,
    aiInsights,
    averageScore: unifiedCalls.length
      ? Math.round(unifiedCalls.reduce((sum, call) => sum + Number(call.score || 0), 0) / unifiedCalls.length)
      : 0,
  };
}

function LiveCallsTab({ initialMonitorCallId = "" }) {
  const { data, error, loading, refreshedAt, reload } = usePollingResource(
    "/api/call-monitoring/live-calls",
    7000
  );
  const [activeMonitoringSession, setActiveMonitoringSession] = useState(null);
  const [pendingMonitoringSession, setPendingMonitoringSession] = useState(null);
  const [monitorJoinStage, setMonitorJoinStage] = useState("");
  const monitorJoinTimersRef = useRef([]);
  const monitorListenerCleanupRef = useRef(null);
  const monitorRequestTimeoutRef = useRef(null);
  const autoOpenedCallIdRef = useRef("");

  const calls = (data?.calls || []).filter((call) => call.canMonitor);
  const analytics = data?.analytics || {
    totalCalls: 0,
    activeCalls: 0,
    averageDurationSeconds: 0,
  };
  const monitoredCall = calls.find((call) => call.callId === activeMonitoringSession?.sessionId) || null;

  const createMonitoringSession = (call) => {
    let supervisorId = "supervisor";
    let supervisorName = "Supervisor";

    try {
      const encryptedUser = sessionStorage.getItem("user");

      if (encryptedUser) {
        const bytes = CryptoJS.AES.decrypt(encryptedUser, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);

        supervisorId = String(user?.userId || supervisorId);
        supervisorName = user?.userFullName || user?.fullName || supervisorName;
      }
    } catch {
      supervisorId = "supervisor";
      supervisorName = "Supervisor";
    }

    return {
      sessionId: call.callId,
      supervisorId,
      supervisorName,
      agentId: call.agentId || call.agent || "agent",
      agentName: call.agent || "Agent",
    };
  };

  const clearMonitorJoinTimers = () => {
    monitorJoinTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    monitorJoinTimersRef.current = [];
  };

  const clearMonitorListeners = () => {
    monitorListenerCleanupRef.current?.();
    monitorListenerCleanupRef.current = null;
  };

  const clearMonitorRequestTimeout = () => {
    if (!monitorRequestTimeoutRef.current) {
      return;
    }

    window.clearTimeout(monitorRequestTimeoutRef.current);
    monitorRequestTimeoutRef.current = null;
  };

  const resetPendingMonitoring = () => {
    clearMonitorJoinTimers();
    clearMonitorListeners();
    clearMonitorRequestTimeout();
    setPendingMonitoringSession(null);
    setMonitorJoinStage("");
  };

  const openMonitoringDrawer = (session) => {
    clearMonitorJoinTimers();
    setActiveMonitoringSession(session);
    setPendingMonitoringSession(null);
    setMonitorJoinStage("");
  };

  const handleMonitorClick = async (call) => {
    if (pendingMonitoringSession) {
      return;
    }

    if (!call?.callId) {
      return;
    }

    clearMonitorJoinTimers();
    clearMonitorListeners();
    clearMonitorRequestTimeout();

    const nextSession = createMonitoringSession(call);
    setPendingMonitoringSession(nextSession);
    setMonitorJoinStage("adding");

    const handleMonitorFailure = (description) => {
      toast({
        title: "Monitor failed",
        description,
      });
      resetPendingMonitoring();
    };

    try {
      const requestId = buildMonitorRequestId();
      const trackingId = buildMonitorRequestId();
      const monitorType = "midcall";
      if (hasWebexDesktopContext()) {
        const desktop = await getMonitoringDesktop();
        const monitoringApi = desktop?.monitoring;

        if (
          !monitoringApi?.startMonitoring ||
          (!monitoringApi?.addEventListener && !monitoringApi?.on)
        ) {
          throw new Error("Monitoring works only inside Webex Contact Center Desktop");
        }

        const matchesTrackingId = (message) => {
          const candidateTrackingId =
            message?.data?.trackingId || message?.trackingId || message?.data?.id || message?.id;

          return candidateTrackingId === trackingId;
        };

        const onMonitoringOffered = (message) => {
          if (!matchesTrackingId(message)) {
            return;
          }

          console.info("[call-monitoring] eMonitoringOffered", message);
          setMonitorJoinStage("connecting");
          toast({
            title: "Monitoring offered",
            description: "Answer the monitoring leg on your supervisor Webex device.",
          });
        };

        const onMonitoringStarted = (message) => {
          if (!matchesTrackingId(message)) {
            return;
          }

          console.info("[call-monitoring] eMonitoringStarted", message);
          clearMonitorListeners();
          clearMonitorRequestTimeout();
          setMonitorJoinStage("connected");

          const interactionId = extractMonitoringInteractionId(message, call.callId);
          const session = {
            ...nextSession,
            desktopMonitoring: {
              mode: "wxcc-desktop",
              interactionId,
              trackingId,
              requestId,
            },
          };

          toast({
            title: "Monitoring connected",
            description: "Supervisor device is now connected to the live call.",
          });

          monitorJoinTimersRef.current.push(
            window.setTimeout(() => {
              openMonitoringDrawer(session);
            }, 300)
          );
        };

        const onMonitoringRequestCreateFailed = (message) => {
          if (!matchesTrackingId(message)) {
            return;
          }

          console.error("[call-monitoring] eMonitoringRequestCreateFailed", message);
          handleMonitorFailure(message?.data?.reason || "Unable to create the monitoring request.");
        };

        const onMonitoringFailed = (message) => {
          if (!matchesTrackingId(message)) {
            return;
          }

          console.error("[call-monitoring] eMonitoringFailed", message);
          handleMonitorFailure(
            message?.data?.reason || "Supervisor device did not connect to the monitoring call."
          );
        };

        const removeOfferedListener = addMonitoringListener(
          monitoringApi,
          "eMonitoringOffered",
          onMonitoringOffered
        );
        const removeStartedListener = addMonitoringListener(
          monitoringApi,
          "eMonitoringStarted",
          onMonitoringStarted
        );
        const removeCreateFailedListener = addMonitoringListener(
          monitoringApi,
          "eMonitoringRequestCreateFailed",
          onMonitoringRequestCreateFailed
        );
        const removeFailedListener = addMonitoringListener(
          monitoringApi,
          "eMonitoringFailed",
          onMonitoringFailed
        );

        monitorListenerCleanupRef.current = () => {
          removeOfferedListener();
          removeStartedListener();
          removeCreateFailedListener();
          removeFailedListener();
        };

        monitorRequestTimeoutRef.current = window.setTimeout(() => {
          handleMonitorFailure("Timed out waiting for the supervisor monitoring call.");
        }, 30000);
      }

      const monitorResult = await startDesktopMonitoring(call.callId, {
        id: requestId,
        monitorType,
        taskId: call.callId,
        trackingId,
      });

      console.info("[call-monitoring] startMonitoring() returned", monitorResult);
    } catch (error) {
      handleMonitorFailure(error?.message || "Unable to start monitoring.");
    }
  };

  const handleMonitoringDrawerChange = async (nextOpen) => {
    if (nextOpen) {
      return;
    }

    const interactionId =
      activeMonitoringSession?.desktopMonitoring?.interactionId || activeMonitoringSession?.sessionId || "";

    if (activeMonitoringSession?.desktopMonitoring?.mode === "wxcc-desktop" && interactionId) {
      try {
        const desktop = await getMonitoringDesktop();

        await desktop?.monitoring?.endMonitoring?.({
          interactionId,
        });
      } catch (error) {
        toast({
          title: "Monitor end warning",
          description: error?.message || "The monitoring session may still be active on the supervisor device.",
        });
      }
    }

    setActiveMonitoringSession(null);
    resetPendingMonitoring();
  };

  useEffect(
    () => () => {
      clearMonitorJoinTimers();
      clearMonitorListeners();
      clearMonitorRequestTimeout();
    },
    []
  );

  useEffect(() => {
    if (!initialMonitorCallId || !calls.length || autoOpenedCallIdRef.current === initialMonitorCallId) {
      return;
    }

    const nextCall = calls.find((call) => call.callId === initialMonitorCallId);

    if (!nextCall || !nextCall.canMonitor) {
      return;
    }

    autoOpenedCallIdRef.current = initialMonitorCallId;
    void handleMonitorClick(nextCall);
  }, [calls, initialMonitorCallId]);

  return (
    <div className="space-y-6">
      <MonitoringPageLayout
        title="Live Calls"
        description="Real-time Webex Contact Center call visibility with live duration tracking and signal-based coaching hints."
        refreshedAt={refreshedAt}
        error={error}
        actions={<TabRefreshButton onClick={reload} />}
      >
        <MonitoringStats
          stats={[
            { label: "Total Calls", value: analytics.totalCalls },
            { label: "Active Calls", value: analytics.activeCalls },
            { label: "Average Duration", value: `${analytics.averageDurationSeconds}s` },
            { label: "Keyword Alerts", value: calls.filter((call) => call.keywordAlerts.length).length },
          ]}
        />

        <section className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-3">Call ID</th>
                  <th className="px-3 py-3">Agent</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">AI Monitoring</th>
                  <th className="px-3 py-3">Agent Buddy</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3 text-right">Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const active = isActiveStatus(call.status);

                  return (
                    <tr key={call.callId} className="border-b border-border/40 align-top">
                      <td className="px-3 py-4 font-medium text-foreground">{call.callId}</td>
                      <td className="px-3 py-4">
                        <div className="font-medium text-foreground">{call.agent}</div>
                        <div className="text-xs text-muted-foreground">
                          {call.queue}
                          {!call.canMonitor ? " • waiting for monitorable audio leg" : ""}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          {call.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-foreground">
                        <LiveDuration
                          startedAt={call.startedAt}
                          durationSeconds={call.durationSeconds}
                          active={active}
                        />
                      </td>
                      <td className="px-3 py-4">
                        {call.keywordAlerts.length ? (
                          <div className="flex flex-wrap gap-2">
                            {call.keywordAlerts.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No keyword alerts</span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        {call.agentBuddy.length ? (
                          <ul className="space-y-1 text-sm text-foreground">
                            {call.agentBuddy.map((suggestion) => (
                              <li key={suggestion}>{suggestion}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">No suggestion</span>
                        )}
                      </td>
                      <td className="px-3 py-4 font-semibold text-foreground">{call.score}</td>
                      <td className="px-3 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={Boolean(pendingMonitoringSession) || !call.canMonitor}
                          onClick={() => void handleMonitorClick(call)}
                        >
                          {!call.canMonitor
                            ? "Unavailable"
                            : pendingMonitoringSession?.sessionId === call.callId
                              ? "Connecting..."
                              : "Monitor"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {!calls.length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                      {loading ? "Loading live calls..." : "No monitorable live calls returned by Webex."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </MonitoringPageLayout>

      <MonitoringDrawer
        open={Boolean(activeMonitoringSession)}
        onOpenChange={(nextOpen) => void handleMonitoringDrawerChange(nextOpen)}
        callId={activeMonitoringSession?.sessionId || ""}
        fallbackCall={monitoredCall}
        activeMonitoringSession={activeMonitoringSession}
      />
      <MonitoringJoinOverlay session={pendingMonitoringSession} stage={monitorJoinStage} />
    </div>
  );
}

function AgentsTab() {
  const { data, error, loading, refreshedAt, reload } = usePollingResource(
    "/api/call-monitoring/agents",
    8000
  );

  const agents = data?.agents || [];

  return (
    <MonitoringPageLayout
      title="Agents"
      description="Agent availability and live Webex Contact Center state updates with polling-based refresh."
      refreshedAt={refreshedAt}
      error={error}
      actions={<TabRefreshButton onClick={reload} />}
    >
      <MonitoringStats
        stats={[
          { label: "Total Agents", value: agents.length },
          { label: "Active Agents", value: agents.filter((agent) => agent.active).length },
          { label: "Teams", value: new Set(agents.map((agent) => agent.team).filter(Boolean)).size },
          { label: "Available States", value: new Set(agents.map((agent) => agent.status)).size },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article
            key={agent.agentId || agent.name}
            className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{agent.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{agent.agentId || "No agent ID"}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getAgentStatusStyles(agent.status)}`}
              >
                {agent.status}
              </span>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Team</dt>
                <dd className="font-medium text-foreground">{agent.team}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Extension</dt>
                <dd className="font-medium text-foreground">{agent.extension || "-"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Call Scenario</dt>
                <dd className="font-medium text-foreground">
                  {agent.currentCallCount
                    ? `${agent.currentCallCount} active call${agent.currentCallCount > 1 ? "s" : ""}`
                    : agent.status}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Live Queue</dt>
                <dd className="font-medium text-foreground">{agent.currentCallQueue || "-"}</dd>
              </div>
            </dl>
          </article>
        ))}

        {!agents.length ? (
          <div className="rounded-2xl border border-border/60 bg-card/95 p-8 text-center text-muted-foreground shadow-sm md:col-span-2 xl:col-span-3">
            {loading ? "Loading agents..." : "No agent data returned by Webex."}
          </div>
        ) : null}
      </section>
    </MonitoringPageLayout>
  );
}

function RecordingsTab() {
  const { data, error, loading, refreshedAt, reload } = usePollingResource(
    "/api/call-monitoring/recordings",
    10000
  );

  const recordings = data?.recordings || [];

  return (
    <MonitoringPageLayout
      title="Recordings"
      description="Recording inventory from Webex Contact Center with playback and download access when URLs are available."
      refreshedAt={refreshedAt}
      error={error}
      actions={<TabRefreshButton onClick={reload} />}
    >
      <MonitoringStats
        stats={[
          { label: "Recordings", value: recordings.length },
          { label: "Playable", value: recordings.filter((recording) => recording.playbackUrl).length },
          { label: "Downloadable", value: recordings.filter((recording) => recording.downloadUrl).length },
          { label: "Transcripts", value: recordings.filter((recording) => recording.transcriptUrl).length },
        ]}
      />

      <section className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-3 py-3">Recording</th>
                <th className="px-3 py-3">Call</th>
                <th className="px-3 py-3">Agent</th>
                <th className="px-3 py-3">Queue</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((recording) => (
                <tr key={recording.recordingId || recording.playbackUrl} className="border-b border-border/40">
                  <td className="px-3 py-4 font-medium text-foreground">{recording.recordingId || "-"}</td>
                  <td className="px-3 py-4 text-foreground">{recording.callId || "-"}</td>
                  <td className="px-3 py-4 text-foreground">{recording.agent}</td>
                  <td className="px-3 py-4 text-foreground">{recording.queue || "-"}</td>
                  <td className="px-3 py-4 text-muted-foreground">
                    {recording.createdAt ? new Date(recording.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      {recording.playbackUrl ? (
                        <a
                          href={recording.playbackUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Play
                        </a>
                      ) : null}
                      {recording.downloadUrl ? (
                        <a
                          href={recording.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Download
                        </a>
                      ) : null}
                      {recording.transcriptUrl ? (
                        <a
                          href={recording.transcriptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Transcript
                        </a>
                      ) : null}
                      {!recording.playbackUrl && !recording.downloadUrl ? (
                        <span className="text-muted-foreground">Unavailable</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!recordings.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    {loading ? "Loading recordings..." : "No recordings returned by Webex."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </MonitoringPageLayout>
  );
}

function AnalyticsTab() {
  const liveResource = usePollingResource("/api/call-monitoring/live-calls", 9000);
  const recordingResource = usePollingResource("/api/call-monitoring/recordings", 12000);

  const calls = liveResource.data?.calls || [];
  const recordings = recordingResource.data?.recordings || [];
  const analytics = useMemo(() => buildAnalyticsViewModel(calls, recordings), [calls, recordings]);
  const error = liveResource.error || recordingResource.error;
  const loading = liveResource.loading || recordingResource.loading;
  const refreshedAt = liveResource.refreshedAt || recordingResource.refreshedAt;

  return (
    <MonitoringPageLayout
      title="Analytics"
      description="Operational summary built from real Webex call and recording data with working charts, alerts, and score visibility."
      refreshedAt={refreshedAt}
      error={error}
      actions={<TabRefreshButton onClick={() => { liveResource.reload(); recordingResource.reload(); }} />}
    >
      <MonitoringStats
        stats={[
          { label: "Total Calls", value: analytics.unifiedCalls.length },
          { label: "Active Calls", value: calls.filter((call) => isActiveStatus(call.status)).length },
          { label: "Average Score", value: analytics.averageScore },
          { label: "Alert Count", value: analytics.alerts.length },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Queue Volume</h2>
            <p className="text-sm text-muted-foreground">Real-time call load by queue.</p>
          </div>
          <div className="h-72">
            {analytics.queueData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.queueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
                {loading ? "Loading queue chart..." : "No queue data available yet."}
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Status Mix</h2>
            <p className="text-sm text-muted-foreground">Current distribution of live call statuses.</p>
          </div>
          <div className="h-72">
            {analytics.statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
                {loading ? "Loading status chart..." : "No live status data available."}
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Call Score Trend</h2>
            <p className="text-sm text-muted-foreground">Live score visibility across active call sessions.</p>
          </div>
          <div className="h-72">
            {analytics.scoreData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.scoreData}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="score" stroke="#10b981" fill="url(#scoreFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
                {loading ? "Loading score chart..." : "No score data available."}
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">AI Insights</h2>
            <p className="text-sm text-muted-foreground">Insights derived from real active calls and recordings.</p>
          </div>
          <div className="space-y-3">
            {analytics.aiInsights.map((insight) => (
              <div key={insight.title} className="rounded-2xl bg-muted/40 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                    {insight.value}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{insight.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Supervisor Alerts</h2>
            <p className="text-sm text-muted-foreground">Alert feed driven by current monitoring conditions.</p>
          </div>
          <div className="space-y-3">
            {analytics.alerts.length ? (
              analytics.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-2xl px-4 py-4 ${
                    alert.severity === "high" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">{alert.label}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm opacity-90">{alert.detail}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No active alerts right now.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Score Visibility</h2>
            <p className="text-sm text-muted-foreground">Current live-call scoring snapshot.</p>
          </div>
          <div className="space-y-3">
            {analytics.unifiedCalls.length ? (
              analytics.unifiedCalls.map((call) => (
                <div key={call.callId} className="rounded-2xl bg-muted/40 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{call.callId}</p>
                      <p className="text-sm text-muted-foreground">
                        {call.agent} • {call.queue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-foreground">{call.score}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Score</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No active call scores available.
              </div>
            )}
          </div>
        </article>
      </section>
    </MonitoringPageLayout>
  );
}

export function CallMonitoringPageView({ initialMonitorCallId = "", initialMonitorRequest = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = initialMonitorCallId || initialMonitorRequest?.callId ? "live-calls" : getSafeTab(searchParams.get("tab"));

  const tabs = useMemo(
    () => [
      {
        value: "live-calls",
        label: "Live Calls",
        content: <LiveCallsTab initialMonitorCallId={initialMonitorCallId} />,
      },
      { value: "agents", label: "Agents", content: <AgentsTab /> },
      { value: "recordings", label: "Recordings", content: <RecordingsTab /> },
      { value: "analytics", label: "Analytics", content: <AnalyticsTab /> },
    ],
    [initialMonitorCallId, initialMonitorRequest]
  );

  const handleTabChange = (value) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "live-calls") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-primary">
            Call Monitoring
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cisco Webex Contact Center Monitoring</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One workspace for live calls, agents, recordings, analytics, and silent monitoring.
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl border border-border/60 bg-card/95 p-2">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-xl px-4 py-2">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default withAuth(CallMonitoringPageView);
