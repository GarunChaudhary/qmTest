import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/login",
  "/api/forgotPassword",
  "/api/resetPassword",
  "/api/generateForgotPasswordOtpByLoginId",
  "/api/generateForgotPasswordOtp",
  "/api/getEmailByLoginId",
  "/api/users/verify-otp",
  "/api/users/set-password",
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/dashboard")) {
    if (pathname.startsWith("/api/call-monitoring")) {
      const widgetKey = req.headers.get("x-call-monitoring-widget-key");

      if (
        widgetKey &&
        process.env.CALL_MONITORING_WIDGET_KEY &&
        widgetKey === process.env.CALL_MONITORING_WIDGET_KEY
      ) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-user-id", "widget-supervisor");
        requestHeaders.set("x-user-role", "widget");

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    }

    const token = req.cookies.get("sessionToken")?.value;

    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { message: "Unauthorized: No session" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.API_SECRET_KEY); // Ensure same secret
      const { payload } = await jwtVerify(token, secret);

      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", String(payload.userId));
      requestHeaders.set("x-user-role", payload.userRole || "");

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (err) {
      console.warn("JWT verify failed in middleware:", err?.message || err);
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { message: "Unauthorized: Invalid session" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}
