import { redirect } from "next/navigation";

export default function CallMonitoringRecordingsRedirectPage() {
  redirect("/call-monitoring?tab=recordings");
}
