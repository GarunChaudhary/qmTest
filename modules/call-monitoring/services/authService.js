import "server-only";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function requireCallMonitoringSession(request) {
  const widgetKey = request.headers.get("x-call-monitoring-widget-key");
  if (
    widgetKey &&
    process.env.CALL_MONITORING_WIDGET_KEY &&
    widgetKey === process.env.CALL_MONITORING_WIDGET_KEY
  ) {
    return {
      session: {
        userId: "widget-supervisor",
        roles: ["widget"],
      },
    };
  }

  const token = request.cookies.get("sessionToken")?.value;

  if (!token) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const secretKey = new TextEncoder().encode(process.env.API_SECRET_KEY);
    const verified = await jwtVerify(token, secretKey);

    return {
      session: {
        userId: verified?.payload?.userId || null,
        roles: verified?.payload?.userRole || [],
      },
    };
  } catch {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
}
