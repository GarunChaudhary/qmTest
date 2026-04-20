export function MonitoringPageLayout({
  title,
  description,
  refreshedAt,
  error,
  actions,
  children,
}) {
  return (
    <div className="space-y-6 pb-6">
      <section className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-primary">
              Call Monitoring
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Last refresh: {refreshedAt || "Waiting for first sync"}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  );
}
