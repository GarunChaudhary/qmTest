"use client";

import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import { MonitoringPageLayout } from "@/modules/call-monitoring/components/MonitoringPageLayout";
import { MonitoringStats } from "@/modules/call-monitoring/components/MonitoringStats";
import { usePollingResource } from "@/modules/call-monitoring/components/usePollingResource";

function AnalyticsPage() {
  const { data, error, loading, refreshedAt, reload } = usePollingResource(
    "/api/call-monitoring/analytics",
    9000
  );

  const analytics = data?.analytics || {
    totalCalls: 0,
    activeCalls: 0,
    averageDurationSeconds: 0,
    keywordSummary: {},
    topSuggestions: [],
  };

  return (
    <MonitoringPageLayout
      title="Analytics"
      description="Operational summary built from real Webex call data, including keyword monitoring, coaching signals, and duration-based scoring."
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
          { label: "Total Calls", value: analytics.totalCalls },
          { label: "Active Calls", value: analytics.activeCalls },
          { label: "Average Duration", value: `${analytics.averageDurationSeconds}s` },
          { label: "Coaching Suggestions", value: analytics.topSuggestions.length },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">AI Monitoring</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keyword detection from real call payload fields when those values are available from Webex.
          </p>

          <div className="mt-5 space-y-3">
            {Object.entries(analytics.keywordSummary || {}).map(([keyword, value]) => (
              <div key={keyword} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="font-medium capitalize text-foreground">{keyword}</span>
                <span className="text-sm text-muted-foreground">{value} matches</span>
              </div>
            ))}

            {!Object.keys(analytics.keywordSummary || {}).length && !loading ? (
              <p className="text-sm text-muted-foreground">No keyword analytics available.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Agent Buddy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suggestions are derived from live status, keyword alerts, and actual call duration.
          </p>

          <div className="mt-5 space-y-3">
            {analytics.topSuggestions?.map((suggestion) => (
              <div key={suggestion} className="rounded-xl bg-muted/50 px-4 py-3 text-sm font-medium text-foreground">
                {suggestion}
              </div>
            ))}

            {!analytics.topSuggestions?.length && !loading ? (
              <p className="text-sm text-muted-foreground">No active coaching suggestions.</p>
            ) : null}
          </div>
        </article>
      </section>
    </MonitoringPageLayout>
  );
}

export default withAuth(AnalyticsPage);
