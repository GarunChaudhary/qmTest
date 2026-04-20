"use client";

export function AIInsights({ sentiment = "Positive", alerts = [], call }) {
  const sentimentTone =
    sentiment === "Negative"
      ? "bg-red-50 text-red-700"
      : sentiment === "Mixed"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
          <p className="text-xs text-muted-foreground">Realtime guidance from monitoring context.</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${sentimentTone}`}>
          Sentiment: {sentiment}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Call Signals
          </p>
          <div className="mt-3 space-y-2 text-sm text-foreground">
            <p>Queue: {call?.queue || "Unknown"}</p>
            <p>Status: {call?.status || "Unknown"}</p>
            <p>Customer: {call?.customer || "Unknown"}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Alerts
          </p>
          <div className="mt-3 space-y-2">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {alert}
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                No critical alerts detected
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
