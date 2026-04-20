import { redirect } from "next/navigation";

export default function CallMonitoringAgentsRedirectPage() {
  redirect("/call-monitoring?tab=agents");
}
