import { NextResponse } from "next/server";

import { requireCallMonitoringSession } from "@/modules/call-monitoring/services/authService";
import {
  getAgentsData,
  getLiveCallsData,
} from "@/modules/call-monitoring/services/callMonitoringService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireCallMonitoringSession(request);
  if (auth.error) return auth.error;

  const [calls, agents] = await Promise.all([getLiveCallsData(), getAgentsData()]);

  return NextResponse.json({
    calls,
    agents,
    generatedAt: new Date().toISOString(),
  });
}
