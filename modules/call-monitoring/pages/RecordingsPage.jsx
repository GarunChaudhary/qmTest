"use client";

import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import { MonitoringPageLayout } from "@/modules/call-monitoring/components/MonitoringPageLayout";
import { MonitoringStats } from "@/modules/call-monitoring/components/MonitoringStats";
import { usePollingResource } from "@/modules/call-monitoring/components/usePollingResource";

function RecordingsPage() {
  const { data, error, loading, refreshedAt, reload } = usePollingResource(
    "/api/call-monitoring/recordings",
    10000
  );

  const recordings = data?.recordings || [];

  return (
    <MonitoringPageLayout
      title="Recordings"
      description="Recording inventory from Webex Contact Center with playback and download access when URLs are available."
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
          { label: "Recordings", value: recordings.length },
          {
            label: "Playable",
            value: recordings.filter((recording) => recording.playbackUrl).length,
          },
          {
            label: "Downloadable",
            value: recordings.filter((recording) => recording.downloadUrl).length,
          },
          {
            label: "Unique Calls",
            value: new Set(recordings.map((recording) => recording.callId).filter(Boolean)).size,
          },
        ]}
      />

      <section className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-3 py-3">Recording</th>
                <th className="px-3 py-3">Call</th>
                <th className="px-3 py-3">Agent</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((recording) => (
                <tr key={recording.recordingId || recording.playbackUrl} className="border-b border-border/40">
                  <td className="px-3 py-4 font-medium text-foreground">{recording.recordingId || "-"}</td>
                  <td className="px-3 py-4 text-foreground">{recording.callId || "-"}</td>
                  <td className="px-3 py-4 text-foreground">{recording.agent}</td>
                  <td className="px-3 py-4 text-muted-foreground">
                    {recording.createdAt ? new Date(recording.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      {recording.playbackUrl ? (
                        <a
                          href={recording.playbackUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Play
                        </a>
                      ) : null}
                      {recording.downloadUrl ? (
                        <a
                          href={recording.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Download
                        </a>
                      ) : null}
                      {!recording.playbackUrl && !recording.downloadUrl ? (
                        <span className="text-muted-foreground">Unavailable</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!recordings.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                    {loading ? "Loading recordings..." : "No recordings returned by Webex."}
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

export default withAuth(RecordingsPage);
