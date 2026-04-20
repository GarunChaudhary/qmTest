import { NextResponse } from "next/server";

import { requireCallMonitoringSession } from "@/modules/call-monitoring/services/authService";
import { getCallDetailsData } from "@/modules/call-monitoring/services/callMonitoringService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireCallMonitoringSession(request);
  if (auth.error) return auth.error;

  try {
    const details = await getCallDetailsData(params?.callId);

    if (!details) {
      return NextResponse.json({ message: "Call details not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        call: details,
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
        message: error?.message || "Unable to load call details from Webex.",
        upstreamStatus: error?.status || 500,
      },
      { status: 502 }
    );
  }
}
