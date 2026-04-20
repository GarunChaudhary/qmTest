"use client";

export function AgentBuddy({ suggestions = [] }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Agent Buddy</h3>
        <p className="text-xs text-muted-foreground">Suggested next-best actions for the agent.</p>
      </div>

      <div className="space-y-2">
        {suggestions.length ? (
          suggestions.map((suggestion) => (
            <div
              key={suggestion}
              className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm"
            >
              {suggestion}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            No coaching suggestions yet.
          </div>
        )}
      </div>
    </section>
  );
}
