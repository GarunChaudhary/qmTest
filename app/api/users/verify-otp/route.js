// app/api/users/verify-otp/route.js

import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export async function POST(request) {
  try {
    const rawBody = await request.text();

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (jsonErr) {
      console.error("[verify-otp] Failed to parse JSON body:", jsonErr);
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { otp, email } = body;
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token || token !== process.env.NEXT_PUBLIC_API_TOKEN) {
      console.warn("[verify-otp] Unauthorized request. Invalid token.");
      return NextResponse.json(
        { success: false, message: "Unauthorized request." },
        { status: 401 }
      );
    }

    if (!otp || !email) {
      console.warn("[verify-otp] Missing fields:", { otp, email });
      return NextResponse.json(
        { success: false, message: "OTP and email are required." },
        { status: 400 }
      );
    }

    const result = await executeStoredProcedure("usp_VerifyUserOTP", {
      otp,
    });

    if (!result?.recordset || !Array.isArray(result.recordset)) {
      console.error("[verify-otp] SP did not return recordset:", result);
      return NextResponse.json(
        { success: false, message: "Database error: No recordset returned." },
        { status: 500 }
      );
    }

    const spRow = result.recordset[0];

    const isValid = spRow?.isValid;
    const userId = spRow?.userId;
    const isExpired = spRow?.isExpired;

    if (!isValid) {
      console.warn("[verify-otp] OTP invalid or expired:", {
        isValid,
        isExpired,
      });
      return NextResponse.json(
        {
          success: false,
          message: isExpired ? "OTP expired." : "Invalid OTP.",
          reason: isExpired ? "expired" : "invalid",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
      userId,
    });
  } catch (error) {
    console.error("[verify-otp] Unexpected server error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
