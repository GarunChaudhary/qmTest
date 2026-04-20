import { NextResponse } from "next/server";

import { requireCallMonitoringSession } from "@/modules/call-monitoring/services/authService";
import { getRecordingsData } from "@/modules/call-monitoring/services/callMonitoringService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireCallMonitoringSession(request);
  if (auth.error) return auth.error;

  try {
    const recordings = await getRecordingsData();

    return NextResponse.json(
      {
        recordings,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: error?.message || "Unable to load recordings from Webex.",
        upstreamStatus: error?.status || 500,
      },
      { status: 502 }
    );
  }
}
