import { redirect } from "next/navigation";

export default function CallMonitoringAnalyticsRedirectPage() {
  redirect("/call-monitoring?tab=analytics");
}
