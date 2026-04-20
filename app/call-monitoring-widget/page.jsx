import { Toaster } from "@/components/ui/toaster";
import { CallMonitoringShell } from "@/modules/call-monitoring/components/CallMonitoringShell";
import { CallMonitoringPageView } from "@/modules/call-monitoring/pages/CallMonitoringPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Call Monitoring Widget | QM NEW",
  description: "WXCC Desktop widget entry for Call Monitoring",
};

export default function CallMonitoringWidgetPage({ searchParams }) {
  const initialMonitorRequest =
    typeof searchParams?.callId === "string" && searchParams.callId
      ? {
          callId: searchParams.callId,
          requestId:
            typeof searchParams?.requestId === "string" && searchParams.requestId
              ? searchParams.requestId
              : searchParams.callId,
          trackingId:
            typeof searchParams?.trackingId === "string" && searchParams.trackingId
              ? searchParams.trackingId
              : searchParams.callId,
          monitorType:
            typeof searchParams?.monitorType === "string" && searchParams.monitorType
              ? searchParams.monitorType
              : "midcall",
        }
      : null;

  return (
    <CallMonitoringShell>
      <main className="flex-1 overflow-y-auto p-2 sm:px-4 sm:py-0 md:gap-1">
        <CallMonitoringPageView
          initialMonitorCallId={initialMonitorRequest?.callId || ""}
          initialMonitorRequest={initialMonitorRequest}
        />
        <Toaster />
      </main>
    </CallMonitoringShell>
  );
}
