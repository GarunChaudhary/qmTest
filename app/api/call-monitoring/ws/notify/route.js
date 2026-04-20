import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (global.callMonitoringWs?.send) {
      global.callMonitoringWs.send({ type: "call-monitoring-event", payload: body });
      return NextResponse.json({ success: true, delivered: true });
    }

    return NextResponse.json({ success: true, delivered: false, warning: "WebSocket server disabled" });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to notify WS" }, { status: 500 });
  }
}
