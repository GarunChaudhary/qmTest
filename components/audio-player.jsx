"use client";

import CryptoJS from "crypto-js";
import { Button } from "./ui/button";
import {
  Pause, Play, Maximize2, Minimize2, User, Headset,
  Volume2, VolumeX, MessageSquare, Check, X, Pencil,
  Trash2, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import React, {
  useRef, useState, useEffect, useCallback, useMemo,
} from "react";
import WaveSurfer from "wavesurfer.js";

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const isAudioFile = (ext) =>
  ["mp3", "wav", "ogg", "m4a", "aac"].includes((ext || "").toLowerCase());
const getUser = () => {
  try {
    const b = CryptoJS.AES.decrypt(sessionStorage.getItem("user") || "", "");
    return JSON.parse(b.toString(CryptoJS.enc.Utf8) || "{}");
  } catch { return {}; }
};
const MAX_WORDS = 30;
const wordCount = (str) => str.trim().split(/\s+/).filter(Boolean).length;

/* ─── Parse transcription JSON → segments ─────────────────── */
function parseTranscriptionData(data) {
  if (!data || data.notFound || data.error) return [];
  const parseTime = (t) => parseFloat((t || "0s").replace("s", ""));

  // Format A: old GCP responseContents
  if (data.responseContents || data?.data?.responseContents) {
    const contents = data.responseContents || data.data.responseContents;
    return contents.map((item, idx) => {
      const rec   = item?.recognitionResult || item;
      const role  = rec?.role || rec?.speaker || "UNKNOWN";
      const alt   = (rec?.alternatives || [])[0] || {};
      const words = (alt.words || []).map((w) => ({
        text:  w.word || w.text || "",
        start: (w.start_time?.seconds || 0) + (w.start_time?.nanos || 0) / 1e9,
        end:   (w.end_time?.seconds   || 0) + (w.end_time?.nanos   || 0) / 1e9,
      }));
      return { id: idx, role, words, transcript: alt.transcript || "" };
    });
  }

  // Format B: Google STT results with speakerTag
  if (data.results) {
    const speakerMap = { 1: "AGENT", 2: "CUSTOMER" };
    const grouped = [];
    (data.results || []).forEach((result) => {
      const alt = (result.alternatives || [])[0];
      if (!alt) return;
      const tag  = (alt.words || [])[0]?.speakerTag ?? 0;
      const role = speakerMap[tag] || `SPEAKER_${tag}`;
      const words = (alt.words || []).map((w) => ({
        text:  w.word || "",
        start: parseTime(w.startTime),
        end:   parseTime(w.endTime),
      }));
      const last = grouped[grouped.length - 1];
      if (last && last.role === role) {
        last.words.push(...words);
        last.transcript += " " + (alt.transcript || "");
      } else {
        grouped.push({ id: grouped.length, role, words, transcript: alt.transcript || "" });
      }
    });
    return grouped;
  }

  return [];
}

/* ─── Role colors ─────────────────────────────────────────── */
// Using inline style objects to avoid Tailwind CSS variable overrides in globals.css
const ROLE_STYLES = {
  AGENT: {
    activeBg:   "rgba(59,130,246,0.12)",   // blue tint
    border:     "1px solid rgba(59,130,246,0.5)",
    iconBg:     "rgba(59,130,246,0.18)",
    labelColor: "#2563eb",                  // blue-600 — visible on light
    labelColorDark: "#60a5fa",              // blue-400 — visible on dark
  },
  CUSTOMER: {
    activeBg:   "rgba(249,115,22,0.12)",   // orange tint
    border:     "1px solid rgba(249,115,22,0.5)",
    iconBg:     "rgba(249,115,22,0.18)",
    labelColor: "#ea580c",                  // orange-600 — visible on light
    labelColorDark: "#fb923c",              // orange-400 — visible on dark
  },
};
const FALLBACK_ROLE_STYLES = [
  { activeBg: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.4)", iconBg: "rgba(168,85,247,0.18)", labelColor: "#9333ea", labelColorDark: "#c084fc" },
  { activeBg: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", iconBg: "rgba(245,158,11,0.18)", labelColor: "#d97706", labelColorDark: "#fbbf24" },
];
function getRoleStyle(role) {
  const key = String(role).toUpperCase();
  if (ROLE_STYLES[key]) return ROLE_STYLES[key];
  const idx = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % FALLBACK_ROLE_STYLES.length;
  return FALLBACK_ROLE_STYLES[idx];
}
// Keep old getRoleColor for any remaining usage
const ROLE_COLORS = {
  AGENT:    { light: "", iconBg: "", border: "", label: "" },
  CUSTOMER: { light: "", iconBg: "", border: "", label: "" },
};
const FALLBACK_COLORS = [
  { light: "", iconBg: "", border: "", label: "" },
  { light: "", iconBg: "", border: "", label: "" },
];
function getRoleColor(role) { return getRoleStyle(role); }

/* ─── TranscriptionCard ───────────────────────────────────── */
const TranscriptionCard = ({ segments, currentTime, loading }) => {
  const scrollRef      = useRef(null);
  const segmentRefs    = useRef({});
  const activeSegIdRef = useRef(null);

  /* Active segment by timestamp */
  const activeSegId = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg   = segments[i];
      const first = seg.words[0];
      const last  = seg.words[seg.words.length - 1];
      if (first && last && currentTime >= first.start && currentTime <= last.end + 0.5)
        return seg.id;
    }
    return null;
  }, [segments, currentTime]);

  /* Auto-scroll to active segment */
  useEffect(() => {
    if (activeSegId === null || activeSegId === activeSegIdRef.current) return;
    activeSegIdRef.current = activeSegId;
    const el        = segmentRefs.current[activeSegId];
    const container = scrollRef.current;
    if (!el || !container) return;
    const top = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top, behavior: "smooth" });
  }, [activeSegId]);

  return (
    <div ref={scrollRef} className="overflow-y-auto px-2 py-1.5 space-y-1" style={{ maxHeight: "180px" }}>
      {loading ? (
        <p className="text-muted-foreground italic text-xs text-center py-3">Loading transcription...</p>
      ) : segments.length ? segments.map((seg) => {
        const isActive = seg.id === activeSegId;
        const rs       = getRoleStyle(seg.role);
        const isAgent  = String(seg.role).toLowerCase().includes("agent");
        const text     = seg.words.length
          ? seg.words.map((w) => w.text).join(" ")
          : seg.transcript;
        return (
          <div key={seg.id}
            ref={(el) => { segmentRefs.current[seg.id] = el; }}
            className="flex gap-2 items-start px-2 py-1.5 rounded-lg transition-all duration-200 hover:bg-muted/40"
            style={isActive ? { background: rs.activeBg, border: rs.border } : {}}>
            {/* Avatar */}
            <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: rs.iconBg }}>
              {isAgent
                ? <Headset className="w-2.5 h-2.5 text-foreground" />
                : <User    className="w-2.5 h-2.5 text-foreground" />}
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold tracking-wide"
                style={{ color: rs.labelColor }}>
                {seg.role.toUpperCase()}
              </span>
              <p className={`mt-0.5 text-xs leading-snug break-words transition-all duration-150
                ${isActive ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                {text}
              </p>
            </div>
          </div>
        );
      }) : (
        <p className="text-muted-foreground italic text-xs text-center py-3">No transcription available for this interaction.</p>
      )}
    </div>
  );
};

/* ─── AnnotationTimeline ──────────────────────────────────── */
const AnnotationTimeline = ({ annotations, duration, onDotClick }) => (
  <div className="relative h-7 w-full mt-2 mb-1 select-none">
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border" />
    <div className="absolute left-0  top-1/2 -translate-y-1/2 h-2 w-px bg-border" />
    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-px bg-border" />
    {annotations.map((ann) => {
      const pct = duration > 0 ? Math.min((ann.timeAt / duration) * 100, 100) : (ann.pct ?? 0);
      return (
        <div key={ann.id}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/dot z-10 cursor-pointer"
          style={{ left: `${pct}%` }}
          onClick={() => onDotClick(ann)}>
          <div className={`w-3.5 h-3.5 rounded-full border-2 border-background shadow-md transition-transform hover:scale-150
            ${ann.saved ? "bg-green-500" : "bg-orange-400"}`} />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover/dot:flex flex-col
            z-30 w-48 rounded-lg border border-border bg-popover shadow-xl px-3 py-2 pointer-events-none">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{fmt(ann.timeAt)}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium
                ${ann.saved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
                {ann.saved ? "saved" : "unsaved"}
              </span>
            </div>
            <p className="text-xs text-foreground leading-snug break-words">{ann.text}</p>
            <p className="text-[9px] text-muted-foreground mt-1">Click to edit</p>
          </div>
        </div>
      );
    })}
  </div>
);

/* ─── AudioPlayer (new — WaveSurfer dual-channel + annotations) */
const AudioPlayer = ({
  AURL,
  filePath,
  fileExtension,
  audioError,
  grantedPrivileges,
  transcriptionFilePath,
  transcriptionSourceType,
  fileSourceType,
  interactionId,
  callData,
  compact = false,
  children,
}) => {
  const agentRef     = useRef(null);
  const customerRef  = useRef(null);
  const wsAgent      = useRef(null);
  const wsCustomer   = useRef(null);
  const wasPlaying   = useRef(false);
  const noteInputRef = useRef(null);

  const [isPlaying, setIsPlaying]   = useState(false);
  const [time, setTime]             = useState(0);
  const [duration, setDuration]     = useState(0);
  const [volume, setVolume]         = useState(0.8);
  const [muted, setMuted]           = useState(false);
  const [speed, setSpeed]           = useState(1);
  const [showTranscript, setShowTranscript] = useState(!!transcriptionFilePath);

  // Transcription segments (fetched here, passed down to TranscriptionCard)
  const [segments, setSegments]                   = useState([]);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);

  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const annotationsRef                = useRef([]);
  const [deletedIds, setDeletedIds]   = useState([]); // Track deleted DB annotation IDs
  const [noteOpen, setNoteOpen]       = useState(false);
  const [noteText, setNoteText]       = useState("");
  const [noteTimeAt, setNoteTimeAt]   = useState(0);
  const [notePct, setNotePct]         = useState(0);
  const [editingId, setEditingId]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState(null);

  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  const hasPlay    = useMemo(() => grantedPrivileges?.some((p) => p.PrivilegeId === 13), [grantedPrivileges]);
  const hasUnsaved = annotations.some((a) => !a.saved) || deletedIds.length > 0;
  const hasTranscription = transcriptionFilePath && transcriptionFilePath.trim().length > 0;

  const audioUnavailable = !AURL;
  const unsupported      = AURL && fileExtension && !isAudioFile(fileExtension);
  const showNotice       = audioUnavailable || unsupported;
  const noticeText       = audioUnavailable ? (audioError || "No audio available.") : "Unsupported audio format.";

  /* Load saved annotations — scoped to current user */
  useEffect(() => {
    if (!interactionId) return;
    const u = getUser();
    const userId = u?.userId;
    if (!userId) return;
    setAnnotations([]);
    setDeletedIds([]);
    fetch(`/api/annotations?interactionId=${interactionId}&userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const dots = [];
        (d.annotations || []).forEach((row) => {
          let ann = row.annotation;
          try { ann = typeof ann === "string" ? JSON.parse(ann) : ann; } catch (_) { /* keep raw annotation */ }
          if (ann?.notes && Array.isArray(ann.notes)) {
            ann.notes.forEach((n, i) => dots.push({
              id: `${row.id}_${i}`, dbRowId: row.id,
              text: n.note ?? n.text ?? "",
              timeAt: n.recordingTimestamp ?? n.timeAt ?? 0,
              pct: 0, saved: true,
            }));
          } else {
            const timeAt = typeof ann === "object" ? (ann?.recordingTimestamp ?? ann?.timeAt ?? 0) : 0;
            const text   = typeof ann === "object" ? (ann.text ?? String(ann)) : String(ann);
            dots.push({ id: String(row.id), dbRowId: row.id, text, timeAt, pct: 0, saved: true });
          }
        });
        setAnnotations(dots);
      }).catch(() => {});
  }, [interactionId]);

  /* Reset on interaction change */
  useEffect(() => { setTime(0); setShowTranscript(!!transcriptionFilePath); setDeletedIds([]); setSegments([]); }, [interactionId, transcriptionFilePath]);

  /* Fetch transcription when path changes */
  useEffect(() => {
    if (!transcriptionFilePath || !transcriptionFilePath.trim()) { setSegments([]); return; }
    setTranscriptionLoading(true);
    // Use dedicated transcription_source_type if available, fall back to audio's fileSourceType
    const srcType = transcriptionSourceType || fileSourceType || "local";
    fetch(`/api/read-transcription?path=${encodeURIComponent(transcriptionFilePath)}&fileSourceType=${encodeURIComponent(srcType)}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
    })
      .then((r) => r.json())
      .then((data) => setSegments(parseTranscriptionData(data)))
      .catch(() => setSegments([]))
      .finally(() => setTranscriptionLoading(false));
  }, [transcriptionFilePath, transcriptionSourceType, fileSourceType]);

  /* Active speaker derived from current time + segments */
  const activeSpeaker = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg   = segments[i];
      const first = seg.words[0];
      const last  = seg.words[seg.words.length - 1];
      if (first && last && time >= first.start && time <= last.end + 0.5)
        return seg.role;
    }
    return null;
  }, [segments, time]);

  /* WaveSurfer setup */
  useEffect(() => {
    if (!AURL || !agentRef.current || !customerRef.current) return;
    wsAgent.current?.destroy(); wsCustomer.current?.destroy();

    const wA = WaveSurfer.create({
      container: agentRef.current, url: AURL,
      height: 52, barWidth: 2, barGap: 1, barRadius: 2,
      cursorWidth: 2, cursorColor: "#1e3a8a",
      waveColor: "#3b82f6", progressColor: "#1e3a8a",
      interact: true, backend: "WebAudio",
    });
    const wC = WaveSurfer.create({
      container: customerRef.current, url: AURL,
      height: 52, barWidth: 2, barGap: 1, barRadius: 2,
      cursorWidth: 2, cursorColor: "#9a3412",
      waveColor: "#fb923c", progressColor: "#9a3412",
      interact: true, backend: "WebAudio",
    });

    const seekRef = { current: false };
    wA.on("ready", () => {
      const d = wA.getDuration() || 0; setDuration(d);
      wA.setVolume(muted ? 0 : volume); wA.setPlaybackRate(speed);
    });
    wA.on("audioprocess", (t) => { setTime(t); try { wC.setTime(t); } catch (_) { /* sync best-effort */ } });
    wA.on("timeupdate",   (t) => { setTime(t); try { wC.setTime(t); } catch (_) { /* sync best-effort */ } });
    wA.on("play",   () => { wasPlaying.current = true;  setIsPlaying(true); });
    wA.on("pause",  () => {
      // Always sync customer waveform pause
      try { if (wC.isPlaying()) wC.pause(); } catch (_) { /* sync best-effort */ }
      if (!seekRef.current) { wasPlaying.current = false; setIsPlaying(false); }
    });
    wA.on("finish", () => {
      wasPlaying.current = false; seekRef.current = false; setIsPlaying(false);
      try { wC.pause(); wC.setTime(0); } catch (_) { /* sync best-effort */ }
    });

    // Customer waveform should never play independently
    wC.on("play", () => {
      if (!wA.isPlaying()) { try { wC.pause(); } catch (_) { /* sync best-effort */ } }
    });

    const handleSeek = (_ws, other) => (newTime) => {
      seekRef.current = true;
      try { other.setTime(newTime); } catch (_) { /* sync best-effort */ }
      setTime(newTime);
      if (wasPlaying.current) {
        requestAnimationFrame(() => { seekRef.current = false; try { wA.play(); wC.play(); } catch (_) { /* sync best-effort */ } });
      } else {
        requestAnimationFrame(() => { seekRef.current = false; });
      }
    };
    wA.on("interaction", handleSeek(wA, wC));
    wC.on("interaction", handleSeek(wC, wA));

    wsAgent.current = wA; wsCustomer.current = wC;
    return () => { wA.destroy(); wC.destroy(); wsAgent.current = null; wsCustomer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AURL]);

  useEffect(() => { wsAgent.current?.setVolume(muted ? 0 : volume); }, [volume, muted]);
  useEffect(() => {
    wsAgent.current?.setPlaybackRate(speed);
    wsCustomer.current?.setPlaybackRate(speed);
  }, [speed]);

  const togglePlay = useCallback(() => {
    if (!wsAgent.current || !hasPlay) return;
    if (isPlaying) {
      wsAgent.current.pause(); wsCustomer.current?.pause();
    } else {
      try {
        const u = getUser();
        fetch(
          `/api/audio?filePath=${encodeURIComponent(filePath)}&interactionId=${interactionId}&fileSourceType=${encodeURIComponent(fileSourceType || "")}&actionType=play`,
          { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, loggedInUserId: u?.userId, userName: u?.userFullName } }
        ).catch(() => {});
      } catch (_) {
        // Ignore playback audit failures.
      }
      wsAgent.current.play(); wsCustomer.current?.play();
    }
  }, [isPlaying, hasPlay, filePath, interactionId, fileSourceType]);

  /* Add note */
  const handleAddNote = useCallback(() => {
    if (!isPlaying || noteOpen) return;
    wasPlaying.current = false; // mark as paused before opening note
    wsAgent.current?.pause(); wsCustomer.current?.pause();
    const t   = wsAgent.current?.getCurrentTime() ?? time;
    const dur = wsAgent.current?.getDuration() ?? duration;
    setNoteTimeAt(t); setNotePct(dur > 0 ? (t / dur) * 100 : 0);
    setNoteText(""); setEditingId(null); setNoteOpen(true);
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [isPlaying, noteOpen, time, duration]);

  /* Click dot → edit */
  const handleDotClick = useCallback((ann) => {
    const wasActive = wsAgent.current?.isPlaying() ?? false;
    wasPlaying.current = wasActive;
    wsAgent.current?.pause(); wsCustomer.current?.pause();
    const dur = wsAgent.current?.getDuration() ?? duration;
    setNoteTimeAt(ann.timeAt);
    setNotePct(dur > 0 ? (ann.timeAt / dur) * 100 : (ann.pct ?? 0));
    setNoteText(ann.text); setEditingId(ann.id); setNoteOpen(true);
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [duration]);

  /* Tick ✓ */
  const handleTick = useCallback(() => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    if (editingId) {
      setAnnotations((p) => p.map((a) => a.id === editingId ? { ...a, text: trimmed, saved: false } : a));
    } else {
      setAnnotations((p) => [...p, { id: `tmp_${Date.now()}`, text: trimmed, timeAt: noteTimeAt, pct: notePct, saved: false }]);
    }
    setNoteOpen(false); setNoteText(""); setEditingId(null);
    // Only resume if was playing before note opened
    if (wasPlaying.current) { wsAgent.current?.play(); wsCustomer.current?.play(); }
  }, [noteText, editingId, noteTimeAt, notePct]);

  /* Delete dot */
  const handleDeleteDot = useCallback(() => {
    if (!editingId) return;
    
    setAnnotations((prev) => {
      const toDelete = prev.find((a) => a.id === editingId);
      // If it's a saved annotation (has dbRowId), track it for deletion on save
      if (toDelete?.saved && toDelete?.dbRowId) {
        setDeletedIds((ids) => [...ids, toDelete.dbRowId]);
      }
      return prev.filter((a) => a.id !== editingId);
    });
    
    setNoteOpen(false); setNoteText(""); setEditingId(null);
    if (wasPlaying.current) { wsAgent.current?.play(); wsCustomer.current?.play(); }
  }, [editingId]);

  /* Cancel */
  const handleCancel = useCallback(() => {
    setNoteOpen(false); setNoteText(""); setEditingId(null);
    if (wasPlaying.current) { wsAgent.current?.play(); wsCustomer.current?.play(); }
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTick(); }
    if (e.key === "Escape") handleCancel();
  }, [handleTick, handleCancel]);

  /* Save all to DB */
  const handleSave = useCallback(async () => {
    const current = annotationsRef.current;
    const hasUnsavedNotes = current.some((a) => !a.saved);
    const hasDeletes = deletedIds.length > 0;
    if ((!hasUnsavedNotes && !hasDeletes) || saving) return;
    setSaving(true); setSaveError(null);
    const u   = getUser();
    const iid = String(interactionId ?? "");

    try {
      // Step 1: Delete removed annotations from DB
      for (const dbRowId of deletedIds) {
        await fetch(`/api/annotations?id=${dbRowId}&interactionId=${iid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        });
      }

      // Step 2: Save new/unsaved annotations
      if (hasUnsavedNotes) {
        const notes = current.map((a) => ({
          note: a.text,
          recordingTimestamp: a.timeAt,
          recordingTimestampFormatted: fmt(a.timeAt),
        }));
        const res = await fetch("/api/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          body: JSON.stringify({
            interaction_id: iid,
            annotation: { notes, interactionId: iid, callId: String(callData?.callId ?? callData?.call_id ?? "") },
            created_by: u?.userId ?? 0,
          }),
        });
        const d = await res.json();
        if (!d.success) { setSaveError(d.message || "Save failed"); return; }
      }

      // Step 3: Mark all remaining as saved, clear deleted list
      setAnnotations((p) => p.map((a) => ({ ...a, saved: true })));
      setDeletedIds([]);
    } catch (e) {
      setSaveError(e.message || "Network error");
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, interactionId, callData, deletedIds]);

  const wordsLeft = MAX_WORDS - wordCount(noteText);

  /* Info lines for popover */
  const [infoLocked, setInfoLocked] = useState(false);
  const infoLines = callData ? [
    { label: "Call ID",      value: callData.callId ?? callData.call_id },
    { label: "Audio Start Time", value: callData.audioStartTime ?? callData.audio_start_time
        ? new Date(callData.audioStartTime ?? callData.audio_start_time).toLocaleString() : null },
    { label: "SID",          value: callData.sid ?? callData.SID },
    { label: "UCID",         value: callData.ucid ?? callData.UCID ?? callData.callId ?? callData.call_id },
    { label: "ANI",          value: callData.ani ?? callData.ANI },
    { label: "Personal Name",value: callData.personalName ?? callData.personal_name },
    { label: "Extension",    value: callData.extension },
    { label: "PBX Login ID", value: callData.pbxLoginId ?? callData.pbx_login_id ?? callData.loginId ?? callData.login_id },
  ].filter((r) => r.value != null && r.value !== "") : [];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Player card ── */}
      <div className="bg-card rounded-2xl shadow-lg border border-l-4 border-l-blue-900 overflow-visible p-5">
        {/* Title + info */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-foreground">
            {callData?.id ?? callData?.callId ?? interactionId ?? "Call Review"}
          </span>
          {infoLines.length > 0 && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => setInfoLocked((v) => !v)}
                className={`h-7 w-7 rounded-full border flex items-center justify-center transition
                  ${infoLocked
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              <div className={`absolute right-0 top-8 z-50 w-56 rounded-xl border border-border bg-popover shadow-lg p-3
                ${infoLocked ? "block" : "hidden group-hover:block"}`}>
                <p className="text-xs font-semibold text-foreground mb-2">Call Information</p>
                {infoLines.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2 text-[11px] py-0.5">
                    <span className="font-medium text-muted-foreground shrink-0">{label}:</span>
                    <span className="text-muted-foreground text-right truncate">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showNotice && (
          <div className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg mb-3">{noticeText}</div>
        )}

        {/* Waveforms */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 pt-2 pb-1 transition-colors duration-300"
            style={activeSpeaker && String(activeSpeaker).toLowerCase().includes("agent")
              ? { background: "rgba(59,130,246,0.12)" } : {}}>
            <span className="text-base shrink-0">🎧</span>
            <div className="flex-1 min-w-0"><div ref={agentRef} /></div>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center gap-2 px-3 pt-2 pb-1 transition-colors duration-300"
            style={activeSpeaker && String(activeSpeaker).toLowerCase().includes("customer")
              ? { background: "rgba(249,115,22,0.12)" } : {}}>
            <span className="text-base shrink-0">👤</span>
            <div className="flex-1 min-w-0"><div ref={customerRef} /></div>
          </div>
        </div>

        {/* Annotation timeline */}
        <AnnotationTimeline annotations={annotations} duration={duration} onDotClick={handleDotClick} />

        {/* Note input popup */}
        {noteOpen && (
          <div className="relative z-30">
            <div className="absolute mt-1 w-60" style={{ left: `min(${duration > 0 ? (noteTimeAt / duration) * 100 : notePct}%, calc(100% - 15.5rem))` }}>
              <div className="rounded-xl border border-primary/30 bg-popover shadow-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                    {editingId ? <Pencil className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    {editingId ? "Edit note" : "Note"} @ {fmt(noteTimeAt)}
                  </span>
                  <span className={`text-[10px] ${wordsLeft < 5 ? "text-red-500" : "text-muted-foreground"}`}>{wordsLeft}w left</span>
                </div>
                <textarea ref={noteInputRef} value={noteText} rows={3}
                  onChange={(e) => { const v = e.target.value; if (wordCount(v) <= MAX_WORDS) setNoteText(v); }}
                  onKeyDown={onKeyDown} placeholder="e.g. positive sentiment…"
                  className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <div className="flex items-center justify-between mt-2">
                  {editingId ? (
                    <button type="button" onClick={handleDeleteDot}
                      className="h-6 w-6 rounded-full border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 transition" title="Delete note">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : <span />}
                  <div className="flex gap-1.5">
                    <button type="button" onClick={handleCancel}
                      className="h-6 w-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition">
                      <X className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={handleTick} disabled={!noteText.trim()}
                      className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition">
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button type="button" onClick={togglePlay} disabled={!hasPlay || showNotice}
            className={`h-8 w-8 shrink-0 rounded-full text-primary-foreground flex items-center justify-center shadow transition
              ${hasPlay && !showNotice ? "bg-foreground hover:bg-foreground/80" : "bg-muted cursor-not-allowed"}`}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>

          <button type="button" onClick={handleAddNote} disabled={!isPlaying}
            title={!isPlaying ? "Play the recording first" : "Add note at current position"}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition
              ${isPlaying ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border bg-card text-muted-foreground cursor-not-allowed"}`}>
            <MessageSquare className="h-3 w-3" /> Add Note
          </button>

          <button type="button" onClick={handleSave} disabled={saving || !hasUnsaved}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition
              ${hasUnsaved && !saving ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" : "border-border bg-muted text-muted-foreground cursor-not-allowed"}`}>
            {saving
              ? <span className="h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              : <Check className="h-3 w-3" />}
            Save
          </button>
          {saveError && <span className="text-[10px] text-red-500 max-w-[120px] truncate" title={saveError}>{saveError}</span>}

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMuted((m) => !m)} className="text-muted-foreground hover:text-foreground transition shrink-0">
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
              className="w-20 accent-primary" />
          </div>

          <div className="flex items-center gap-0.5">
            {[0.5, 1, 1.5, 2].map((r) => (
              <button key={r} type="button" onClick={() => setSpeed(r)}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold border transition
                  ${speed === r ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:bg-muted/50"}`}>
                {r}x
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-muted-foreground tabular-nums font-medium">{fmt(time)} / {fmt(duration)}</span>
        </div>
      </div>

      {/* ── Transcription ── */}
      <div className="rounded-xl border border-border border-l-4 border-l-blue-700 bg-card shadow-sm overflow-hidden">
        <button type="button" onClick={() => setShowTranscript((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 border-b border-border hover:bg-muted/50 transition">
          <span className="text-xs font-bold text-foreground tracking-tight">Transcription</span>
          {showTranscript ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showTranscript ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0"}`}>
          {hasTranscription
            ? <TranscriptionCard segments={segments} loading={transcriptionLoading} currentTime={time} />
            : <p className="text-xs text-muted-foreground italic text-center py-4">No transcription available for this interaction.</p>
          }
        </div>
      </div>

      {/* ── Buttons slot (Evaluation / Submitted Forms) ── */}
      {children && (
        <div className="flex gap-3 items-center flex-wrap pt-1">
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── VideoPlayer (original — completely unchanged) ────────── */
const VideoPlayer = ({ VURL, grantedPrivileges }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const hasCallPlayPrivilege = grantedPrivileges.some(
    (priv) => priv.PrivilegeId === 13,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    let animationFrame;
    const updateTime = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        animationFrame = requestAnimationFrame(updateTime);
      }
    };
    if (isPlaying) animationFrame = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  const onPlayPause = useCallback(() => {
    const video = videoRef.current;
    if (hasCallPlayPrivilege && video) {
      isPlaying ? video.pause() : video.play();
    }
  }, [isPlaying, hasCallPlayPrivilege]);

  const onSeek = (event) => {
    const progressBar = event.target;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const seekTo = (clickX / progressBar.clientWidth) * duration;
    if (videoRef.current) videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const toggleFullScreen = () => {
    const video = videoRef.current;
    if (!document.fullscreenElement) video.requestFullscreen();
    else document.exitFullscreen();
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const formatTime = (seconds) =>
    [seconds / 60, seconds % 60].map((v) => `0${Math.floor(v)}`.slice(-2)).join(":");

  return (
    <div className={`m-4 ${isFullScreen ? "w-screen h-screen" : ""}`}>
      <div className={`flex items-center justify-center ${isFullScreen ? "h-screen" : "h-auto"}`}>
        <video
          ref={videoRef} src={VURL} onLoadedMetadata={onLoadedMetadata}
          className={`rounded transition-all duration-300 ease-in-out ${isFullScreen ? "w-screen h-screen" : "max-w-md w-full"}`}
          controls={false}
        />
      </div>
      <div className="w-full h-1 bg-gray-300 cursor-pointer mt-1" onClick={onSeek}>
        <div className="h-full bg-blue-600" style={{ width: `${(currentTime / duration) * 100}%` }} />
      </div>
      <div className="flex gap-4 items-center m-4 justify-center">
        <Button onClick={onPlayPause} className="rounded p-2" variant="icon" disabled={!hasCallPlayPrivilege}>
          {isPlaying ? <Pause width={24} height={24} /> : <Play width={24} height={24} />}
        </Button>
        <p className="text-lg">{formatTime(currentTime)}</p>
        <Button onClick={toggleFullScreen} className="rounded p-2" variant="icon">
          {isFullScreen ? <Minimize2 width={24} height={24} /> : <Maximize2 width={24} height={24} />}
        </Button>
      </div>
    </div>
  );
};

export { AudioPlayer, VideoPlayer };
