import { NextResponse } from "next/server";

const webhookEvents = global.callMonitoringWebhookEvents || [];

if (!global.callMonitoringWebhookEvents) {
  global.callMonitoringWebhookEvents = webhookEvents;
}

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  global.callMonitoringWebhookEvents.unshift({
    event: body,
    receivedAt: new Date().toISOString(),
  });

  global.callMonitoringWebhookEvents = global.callMonitoringWebhookEvents.slice(0, 100);

  return NextResponse.json({
    received: true,
    storedEvents: global.callMonitoringWebhookEvents.length,
  });
}

export async function GET() {
  return NextResponse.json({
    events: global.callMonitoringWebhookEvents || [],
  });
}
