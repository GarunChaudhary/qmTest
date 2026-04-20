export function MonitoringStats({ stats = [] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {stat.value}
          </p>
          {stat.helpText ? (
            <p className="mt-2 text-sm text-muted-foreground">{stat.helpText}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
