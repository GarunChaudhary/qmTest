"use client";

import { useEffect, useMemo, useState } from "react";

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function LiveDuration({ startedAt, durationSeconds = 0, active = false }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active || !startedAt) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  const liveDuration = useMemo(() => {
    if (!active || !startedAt) {
      return durationSeconds;
    }

    const startedTime = new Date(startedAt).getTime();

    if (Number.isNaN(startedTime)) {
      return durationSeconds;
    }

    return Math.max(durationSeconds, Math.floor((now - startedTime) / 1000));
  }, [active, durationSeconds, now, startedAt]);

  return <span>{formatDuration(liveDuration)}</span>;
}
