import { CallMonitoringShell } from "@/modules/call-monitoring/components/CallMonitoringShell";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "Call Monitoring | QM NEW",
  description: "Cisco Webex Contact Center call monitoring module",
};

export default function CallMonitoringLayout({ children }) {
  return (
    <CallMonitoringShell>
      {children}
      <Toaster />
    </CallMonitoringShell>
  );
}
