"use client";

import { useEffect, useRef } from "react";

export function TranscriptPanel({ transcript = [], isLive = false }) {
  const transcriptContainerRef = useRef(null);

  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript]);

  return (
    <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Transcript Stream</h3>
          <p className="text-xs text-muted-foreground">
            Simulated ASR updates for supervisor monitoring.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
            isLive ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-red-500" : "bg-muted-foreground/60"}`} />
          {isLive ? "LIVE" : "PAUSED"}
        </span>
      </div>

      <div ref={transcriptContainerRef} className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {transcript.length ? (
          transcript.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                entry.speaker === "Customer"
                  ? "bg-amber-50 text-amber-950"
                  : "bg-emerald-50 text-emerald-950"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-semibold">{entry.speaker}</span>
                <span className="text-[11px] opacity-70">{entry.timeLabel}</span>
              </div>
              <p>{entry.text}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Transcript will appear as monitoring starts.
          </div>
        )}
      </div>
    </section>
  );
}
