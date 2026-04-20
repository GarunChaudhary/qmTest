"use client";

import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import { MonitoringPageLayout } from "@/modules/call-monitoring/components/MonitoringPageLayout";
import { MonitoringStats } from "@/modules/call-monitoring/components/MonitoringStats";
import { usePollingResource } from "@/modules/call-monitoring/components/usePollingResource";

function AgentsPage() {
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
      actions={
        <Button type="button" variant="outline" onClick={reload}>
          Refresh now
        </Button>
      }
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
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  agent.active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-muted text-foreground"
                }`}
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

export default withAuth(AgentsPage);
