"use client";

import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import { LiveDuration } from "@/modules/call-monitoring/components/LiveDuration";
import { MonitoringPageLayout } from "@/modules/call-monitoring/components/MonitoringPageLayout";
import { MonitoringStats } from "@/modules/call-monitoring/components/MonitoringStats";
import { usePollingResource } from "@/modules/call-monitoring/components/usePollingResource";

function LiveCallsPage() {
  const { data, error, loading, refreshedAt, reload } = usePollingResource(
    "/api/call-monitoring/live-calls",
    7000
  );

  const calls = data?.calls || [];
  const analytics = data?.analytics || {
    totalCalls: 0,
    activeCalls: 0,
    averageDurationSeconds: 0,
  };

  return (
    <MonitoringPageLayout
      title="Live Calls"
      description="Real-time Webex Contact Center call visibility with live duration tracking and signal-based coaching hints."
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
          { label: "Keyword Alerts", value: calls.filter((call) => call.keywordAlerts.length).length },
        ]}
      />

      <section className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-3 py-3">Call ID</th>
                <th className="px-3 py-3">Agent</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3">AI Monitoring</th>
                <th className="px-3 py-3">Agent Buddy</th>
                <th className="px-3 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => {
                const active = ["active", "connected", "inprogress", "engaged"].some((token) =>
                  call.status.toLowerCase().includes(token)
                );

                return (
                  <tr key={call.callId} className="border-b border-border/40 align-top">
                    <td className="px-3 py-4 font-medium text-foreground">{call.callId}</td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-foreground">{call.agent}</div>
                      <div className="text-xs text-muted-foreground">{call.queue}</div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                        {call.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-foreground">
                      <LiveDuration
                        startedAt={call.startedAt}
                        durationSeconds={call.durationSeconds}
                        active={active}
                      />
                    </td>
                    <td className="px-3 py-4">
                      {call.keywordAlerts.length ? (
                        <div className="flex flex-wrap gap-2">
                          {call.keywordAlerts.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No keyword alerts</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {call.agentBuddy.length ? (
                        <ul className="space-y-1 text-sm text-foreground">
                          {call.agentBuddy.map((suggestion) => (
                            <li key={suggestion}>{suggestion}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">No suggestion</span>
                      )}
                    </td>
                    <td className="px-3 py-4 font-semibold text-foreground">{call.score}</td>
                  </tr>
                );
              })}

              {!calls.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    {loading ? "Loading live calls..." : "No live calls returned by Webex."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </MonitoringPageLayout>
  );
}

export default withAuth(LiveCallsPage);
