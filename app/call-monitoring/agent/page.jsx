import { redirect } from "next/navigation";

export default function LegacyCallMonitoringAgentPage() {
  redirect("/call-monitoring?tab=agents");
}
