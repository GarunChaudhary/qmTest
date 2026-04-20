"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgentBuddy } from "@/components/call-monitoring/AgentBuddy";
import { AIInsights } from "@/components/call-monitoring/AIInsights";
import { TranscriptPanel } from "@/components/call-monitoring/TranscriptPanel";
import { useWhisperSocket } from "@/components/call-monitoring/useWhisperSocket";
import { LiveDuration } from "@/modules/call-monitoring/components/LiveDuration";
import { usePollingResource } from "@/modules/call-monitoring/components/usePollingResource";

const CUSTOMER_LINES = [
  "I want to cancel my order.",
  "This issue has been frustrating for me.",
  "Can you please resolve this today?",
  "I need clarity on what happens next.",
];

const AGENT_LINES = [
  "Let me help you with that right away.",
  "I understand your concern and I will assist.",
  "I can review the order details for you.",
  "I will explain the options clearly.",
];

const AGENT_WHISPER_REPLIES = [
  "Understood. I will adjust the call flow now.",
  "Thanks, I will handle that carefully.",
  "I can take that approach on this call.",
];

function isLiveStatus(status) {
  return ["active", "connected", "inprogress", "engaged"].some((token) =>
    String(status || "").toLowerCase().includes(token)
  );
}

function buildTranscriptSeed(call) {
  const queueName = call?.queue || "support";
  const customerName = call?.customer || "Customer";

  return [
    {
      id: "seed-customer",
      speaker: "Customer",
      timeLabel: "00:03",
      text: `${customerName}: I need help with my ${queueName.toLowerCase()} request.`,
    },
    {
      id: "seed-agent",
      speaker: "Agent",
      timeLabel: "00:06",
      text: `${call?.agent || "Agent"}: I am checking the details and will guide you.`,
    },
  ];
}

function buildTranscriptEntry(call, index) {
  const speaker = index % 2 === 0 ? "Customer" : "Agent";
  const source = speaker === "Customer" ? CUSTOMER_LINES : AGENT_LINES;
  const rawText = source[index % source.length];

  return {
    id: `entry-${speaker}-${index}`,
    speaker,
    timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    text:
      speaker === "Customer"
        ? rawText
        : rawText.replace("Agent", call?.agent || "Agent"),
  };
}

function buildInsights(call, transcript) {
  const transcriptText = transcript.map((entry) => entry.text.toLowerCase()).join(" ");
  const negativeSignals = ["cancel", "frustrating", "angry", "complaint"];
  const hasNegative = negativeSignals.some((signal) => transcriptText.includes(signal));
  const longCall = Number(call?.durationSeconds || 0) >= 120;

  const alerts = [];
  if (hasNegative) alerts.push("Angry customer detected");
  if (longCall) alerts.push("Long call detected");
  if (call?.agent === "Unassigned") alerts.push("Agent assignment pending");

  const suggestions = [
    hasNegative ? "Offer refund" : "Acknowledge the concern confidently",
    longCall ? "Escalate to supervisor" : "Close politely",
    call?.queue ? `Reference ${call.queue} SOP while responding` : "Summarize next steps clearly",
  ];

  return {
    sentiment: hasNegative ? "Negative" : longCall ? "Mixed" : "Positive",
    alerts: alerts.map((item) => `⚠️ ${item}`),
    suggestions,
  };
}

function buildInitialMessages(call) {
  return [
    {
      id: `agent-ready-${call?.callId || "call"}`,
      role: "agent",
      label: call?.agent || "Agent",
      text: "Ready for supervisor coaching on this call.",
      timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];
}

function buildAgentReply(message, call) {
  const normalizedMessage = String(message || "").toLowerCase();

  if (normalizedMessage.includes("refund")) {
    return "I can position a refund option and confirm the policy.";
  }

  if (normalizedMessage.includes("escalate") || normalizedMessage.includes("supervisor")) {
    return "I will prepare the customer for an escalation path.";
  }

  if (normalizedMessage.includes("close") || normalizedMessage.includes("wrap")) {
    return "I will summarize the next steps and close politely.";
  }

  const queueName = call?.queue || "the queue workflow";
  return AGENT_WHISPER_REPLIES[normalizedMessage.length % AGENT_WHISPER_REPLIES.length].replace(
    "that",
    queueName
  );
}

function Waveform({ isPaused = false }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 transition-all duration-300">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Audio Simulation</h3>
          <p className="text-xs text-muted-foreground">
            {isPaused ? "Monitoring audio paused for this session." : "Listening to live call..."}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isPaused ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isPaused ? "bg-amber-500" : "animate-pulse bg-red-500"
            }`}
          />
          {isPaused ? "PAUSED" : "LIVE"}
        </span>
      </div>
      <div
        className={`flex h-20 items-end gap-1 rounded-xl px-4 py-3 transition-all duration-300 ${
          isPaused
            ? "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200"
            : "bg-gradient-to-r from-slate-950 via-slate-800 to-slate-900"
        }`}
      >
        {Array.from({ length: 28 }).map((_, index) => (
          <span
            key={index}
            className={`w-2 rounded-full ${
              isPaused ? "bg-slate-400/70" : "animate-pulse bg-emerald-400/90"
            }`}
            style={{
              height: `${16 + ((index * 13) % 48)}px`,
              animationDuration: `${0.75 + (index % 5) * 0.12}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MonitoringDrawer({
  open,
  onOpenChange,
  callId,
  fallbackCall,
  activeMonitoringSession = null,
}) {
  const { data, error, loading } = usePollingResource("/api/call-monitoring/live-calls", 5000);
  const socket = useWhisperSocket(open ? activeMonitoringSession : null);
  const [transcript, setTranscript] = useState(() => buildTranscriptSeed(fallbackCall));
  const [messages, setMessages] = useState(() => buildInitialMessages(fallbackCall));
  const [messageInput, setMessageInput] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [isJoiningCall, setIsJoiningCall] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [agentReceiveNotice, setAgentReceiveNotice] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");

  const transcriptCounterRef = useRef(0);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioElementRef = useRef(null);
  const audioUrlRef = useRef("");
  const replyTimeoutRef = useRef(null);
  const sendingTimeoutRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const joiningTimeoutRef = useRef(null);
  const noticeTimeoutRef = useRef(null);

  const liveCall = useMemo(() => {
    const calls = data?.calls || [];
    return calls.find((entry) => entry.callId === callId) || fallbackCall || null;
  }, [callId, data?.calls, fallbackCall]);
  const isDesktopMonitoringSession = activeMonitoringSession?.desktopMonitoring?.mode === "wxcc-desktop";

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!open || !liveCall) {
      return;
    }

    transcriptCounterRef.current = 0;
    setTranscript(buildTranscriptSeed(liveCall));
    setMessages(buildInitialMessages(liveCall));
    setMessageInput("");
    setIsPaused(false);
    setIsJoiningCall(false);
    setAgentSpeaking(false);
    setIsSendingVoice(false);
    setAgentReceiveNotice("");
  }, [liveCall?.callId, open]);

  useEffect(() => {
    if (!open || !liveCall || isPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      transcriptCounterRef.current += 1;

      setTranscript((current) => {
        const next = [...current, buildTranscriptEntry(liveCall, transcriptCounterRef.current)];
        return next.slice(-8);
      });
    }, 3200);

    return () => window.clearInterval(timer);
  }, [isPaused, liveCall, open]);

  const insights = useMemo(() => buildInsights(liveCall, transcript), [liveCall, transcript]);

  const clearTimeoutRef = (timeoutRef) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clearSessionTimeouts = () => {
    clearTimeoutRef(replyTimeoutRef);
    clearTimeoutRef(sendingTimeoutRef);
    clearTimeoutRef(speakingTimeoutRef);
    clearTimeoutRef(joiningTimeoutRef);
    clearTimeoutRef(noticeTimeoutRef);
  };

  const clearPreviewAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = "";
      audioElementRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    setAudioPreviewUrl("");
  };

  const stopMediaStream = () => {
    if (!mediaStreamRef.current) {
      return;
    }

    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const stopRecorder = (discard = false) => {
    const recorder = mediaRecorderRef.current;

    if (recorder) {
      if (discard) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
      }

      if (recorder.state !== "inactive") {
        recorder.stop();
      }

      if (discard || recorder.state === "inactive") {
        mediaRecorderRef.current = null;
      }
    }

    if (discard) {
      audioChunksRef.current = [];
      stopMediaStream();
      setIsRecording(false);
    }
  };

  const cleanupMonitoringSession = () => {
    clearSessionTimeouts();
    socket?.disconnect?.();
    stopRecorder(true);
    stopMediaStream();
    clearPreviewAudio();
    setIsPaused(false);
    setIsRecording(false);
    setIsSendingVoice(false);
    setIsJoiningCall(false);
    setAgentSpeaking(false);
    setAgentReceiveNotice("");
    setMessageInput("");
    setMessages([]);
  };

  useEffect(() => {
    if (open) {
      return undefined;
    }

    cleanupMonitoringSession();
    return undefined;
  }, [open]);

  useEffect(() => () => cleanupMonitoringSession(), [socket]);

  const handleAction = (title, description) => {
    toast({
      title,
      description,
    });
  };

  const showAgentReceiveNotice = (message) => {
    setAgentReceiveNotice(message);
    clearTimeoutRef(noticeTimeoutRef);
    noticeTimeoutRef.current = window.setTimeout(() => {
      setAgentReceiveNotice("");
    }, 2200);
  };

  const pushAgentReply = (message) => {
    clearTimeoutRef(replyTimeoutRef);
    replyTimeoutRef.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          label: liveCall?.agent || "Agent",
          text: buildAgentReply(message, liveCall),
          timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1200);
  };

  useEffect(() => {
    if (!socket || !activeMonitoringSession?.sessionId || !liveCall) {
      return undefined;
    }

    const unsubscribeWhisper = socket.on("whisper", (payload) => {
      if (payload.supervisorId !== activeMonitoringSession.supervisorId) {
        return;
      }

      showAgentReceiveNotice("Agent received supervisor whisper");
      pushAgentReply(payload.message);
    });

    const unsubscribeVoiceWhisper = socket.on("voiceWhisper", (payload) => {
      if (payload.supervisorId !== activeMonitoringSession.supervisorId) {
        return;
      }

      setIsSendingVoice(false);
      setAgentSpeaking(true);
      showAgentReceiveNotice("Agent is hearing supervisor guidance");

      if (payload.audio instanceof Blob) {
        const playbackUrl = URL.createObjectURL(payload.audio);
        const audio = new Audio(playbackUrl);
        audioElementRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(playbackUrl);
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(playbackUrl);
        });
      }

      clearTimeoutRef(speakingTimeoutRef);
      speakingTimeoutRef.current = window.setTimeout(() => {
        setAgentSpeaking(false);
      }, 2600);

      pushAgentReply("voice whisper");
    });

    return () => {
      unsubscribeWhisper?.();
      unsubscribeVoiceWhisper?.();
    };
  }, [
    activeMonitoringSession?.sessionId,
    activeMonitoringSession?.supervisorId,
    liveCall,
    socket,
  ]);

  const handleSendMessage = () => {
    const nextMessage = messageInput.trim();

    if (!nextMessage || isPaused || !socket || !activeMonitoringSession?.sessionId) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `supervisor-${Date.now()}`,
        role: "supervisor",
        label: "You",
        text: nextMessage,
        timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setMessageInput("");

    socket.emit("whisper", {
      sessionId: activeMonitoringSession.sessionId,
      supervisorId: activeMonitoringSession.supervisorId,
      agentId: activeMonitoringSession.agentId,
      message: nextMessage,
    });

    handleAction("Whisper sent to agent", "Your private coaching message was delivered in the monitoring session.");
  };

  const handleStartRecording = async () => {
    if (isPaused || isRecording || typeof window === "undefined") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      handleAction("Microphone unavailable", "This browser session does not support voice whisper recording.");
      return;
    }

    try {
      clearPreviewAudio();
      clearSessionTimeouts();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        stopMediaStream();
        setIsRecording(false);

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        audioChunksRef.current = [];

        if (!blob.size) {
          return;
        }

        const nextAudioUrl = URL.createObjectURL(blob);
        audioUrlRef.current = nextAudioUrl;
        setAudioPreviewUrl(nextAudioUrl);
        setIsSendingVoice(true);
        setMessages((current) => [
          ...current,
          {
            id: `voice-${Date.now()}`,
            role: "supervisor",
            label: "You",
            text: "[Voice whisper sent]",
            timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        handleAction("Voice whisper captured", "Recording complete. Sending voice to the agent simulation.");

        sendingTimeoutRef.current = window.setTimeout(() => {
          socket?.emit("voiceWhisper", {
            sessionId: activeMonitoringSession?.sessionId || liveCall?.callId || "",
            supervisorId: activeMonitoringSession?.supervisorId || "supervisor",
            agentId: activeMonitoringSession?.agentId || liveCall?.agentId || liveCall?.agent || "agent",
            audio: blob,
          });
        }, 900);
      };

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      stopRecorder(true);
      clearPreviewAudio();
      handleAction(
        "Recording failed",
        recordingError?.message || "Microphone access was blocked for this monitoring session."
      );
    }
  };

  const handleToggleRecording = () => {
    if (isPaused) {
      return;
    }

    if (isRecording) {
      stopRecorder(false);
      return;
    }

    handleStartRecording();
  };

  const handlePauseMonitoring = () => {
    stopRecorder(true);
    clearSessionTimeouts();
    setIsPaused(true);
    setIsSendingVoice(false);
    setAgentSpeaking(false);

    handleAction("Monitoring paused", "Transcript, timer, and whisper controls are paused for this session.");
  };

  const handleResumeMonitoring = () => {
    setIsPaused(false);
    handleAction("Monitoring resumed", "Transcript updates and whisper controls are live again.");
  };

  const handleCloseDrawer = () => {
    cleanupMonitoringSession();
    handleAction("Monitoring ended", "Silent monitoring session closed.");
    onOpenChange(false);
  };

  const handleFocusWhisper = () => {
    chatInputRef.current?.focus();

    if (isDesktopMonitoringSession) {
      handleAction(
        "Supervisor coaching ready",
        "Use your connected Webex supervisor device for live coaching controls after monitoring connects."
      );
      return;
    }

    handleAction("Coaching panel focused", "Whisper notes are ready in this monitoring session.");
  };

  const handleBargeIn = () => {
    clearTimeoutRef(joiningTimeoutRef);
    setIsJoiningCall(true);
    joiningTimeoutRef.current = window.setTimeout(() => {
      setIsJoiningCall(false);
    }, 2200);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-border/60 p-0 sm:max-w-2xl">
        <div className="flex min-h-full flex-col bg-gradient-to-b from-background via-background to-muted/30">
          <SheetHeader className="border-b border-border/60 px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="flex flex-wrap items-center gap-3">
                  Silent Monitoring
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isPaused ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isPaused ? "bg-amber-500" : "animate-pulse bg-red-500"
                      }`}
                    />
                    {isPaused ? "⏸ Monitoring Paused" : "LIVE"}
                  </span>
                  {isJoiningCall ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Joining call...
                    </span>
                  ) : null}
                </SheetTitle>
                <SheetDescription className="mt-2">
                  Supervisor control panel with transcript, AI assistance, whisper chat, and voice coaching.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-6 px-6 py-6">
            {loading && !liveCall ? (
              <div className="rounded-2xl border border-border/60 bg-card/95 p-6 text-sm text-muted-foreground shadow-sm">
                Loading monitoring session...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {liveCall ? (
              <>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 transition-all duration-300">
                  🎧 Supervisor joined call. Agent-only coaching is active for{" "}
                  <span className="font-semibold">{activeMonitoringSession?.agentName || liveCall.agent}</span>
                  .
                </div>

                {isDesktopMonitoringSession ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    Live call audio is routed through the supervisor Webex device. Keep that device connected and
                    answer the monitoring leg there to hear the call.
                  </div>
                ) : null}

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Call ID</p>
                    <p className="mt-2 break-all text-sm font-semibold text-foreground">{liveCall.callId}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Agent</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{liveCall.agent}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Queue</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{liveCall.queue}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                        {liveCall.status}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        <LiveDuration
                          startedAt={liveCall.startedAt}
                          durationSeconds={liveCall.durationSeconds}
                          active={isLiveStatus(liveCall.status) && !isPaused}
                        />
                      </span>
                    </div>
                  </div>
                </section>

                <Waveform isPaused={isPaused} />

                {agentSpeaking ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 transition-all duration-300">
                    Supervisor speaking...
                  </div>
                ) : null}

                {isSendingVoice ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 transition-all duration-300">
                    👂 Sending voice to agent...
                  </div>
                ) : null}

                {agentReceiveNotice ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 transition-all duration-300">
                    {agentReceiveNotice}
                  </div>
                ) : null}

                <TranscriptPanel transcript={transcript} isLive={open && !isPaused} />
                <AIInsights sentiment={insights.sentiment} alerts={insights.alerts} call={liveCall} />

                <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <AgentBuddy suggestions={insights.suggestions} />

                    <section className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Monitoring Controls</h3>
                          <p className="text-xs text-muted-foreground">
                            Pause or resume the monitoring session without leaving the drawer.
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isPaused ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {isPaused ? "Paused" : "Active"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={handleFocusWhisper} disabled={isPaused}>
                          Whisper
                        </Button>
                        <Button type="button" variant="outline" onClick={handleBargeIn} disabled={isPaused}>
                          {isJoiningCall ? "Joining..." : "Barge-in"}
                        </Button>
                        {isPaused ? (
                          <Button type="button" variant="outline" onClick={handleResumeMonitoring}>
                            Resume Monitoring
                          </Button>
                        ) : (
                          <Button type="button" variant="outline" onClick={handlePauseMonitoring}>
                            Pause Monitoring
                          </Button>
                        )}
                        <Button type="button" onClick={handleCloseDrawer}>
                          End Monitoring
                        </Button>
                      </div>
                    </section>
                  </div>

                  <section className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Type Whisper</h3>
                        <p className="text-xs text-muted-foreground">
                          Private coaching stays scoped to this active monitoring session.
                        </p>
                      </div>
                      {isRecording ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          🎤 Recording...
                        </span>
                      ) : null}
                    </div>

                    <div
                      ref={chatContainerRef}
                      className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-muted/30 p-3"
                    >
                      {messages.length ? (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === "supervisor" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-300 ${
                                message.role === "supervisor"
                                  ? "bg-blue-600 text-white"
                                  : "bg-emerald-100 text-emerald-950"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold">
                                <span>{message.label}</span>
                                <span className={message.role === "supervisor" ? "text-blue-100" : "text-emerald-800"}>
                                  {message.timeLabel}
                                </span>
                              </div>
                              <p>{message.text}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                          Whisper chat will appear when monitoring starts.
                        </div>
                      )}
                    </div>

                    {audioPreviewUrl ? (
                      <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Voice Whisper Preview</p>
                            <p className="text-xs text-muted-foreground">
                              Local playback preview before the next coaching message.
                            </p>
                          </div>
                        </div>
                        <audio controls src={audioPreviewUrl} className="w-full" />
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={isPaused}
                        placeholder="Type message to agent..."
                        className="h-11 flex-1 rounded-xl border border-border/60 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-muted"
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleToggleRecording} disabled={isPaused}>
                          {isRecording ? "Stop Mic" : "Mic"}
                        </Button>
                        <Button type="button" onClick={handleSendMessage} disabled={isPaused || !messageInput.trim()}>
                          Send
                        </Button>
                      </div>
                    </div>
                  </section>
                </section>
              </>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card/95 p-6 text-sm text-muted-foreground shadow-sm">
                No live call is available for monitoring right now.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
