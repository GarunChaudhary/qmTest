// app/api/users/check-otp-status/route.js
// app/api/users/check-otp-status/route.js
import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export async function GET(req) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    console.warn("[check-otp-status] Missing email query param");
    return NextResponse.json(
      { success: false, message: "Email query parameter is required." },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await executeStoredProcedure("usp_CheckOtpStatus", { email });
  } catch (err) {
    console.error("[check-otp-status] SP execution error:", err);
    return NextResponse.json(
      { success: false, message: "Database error: " + err.message },
      { status: 500 }
    );
  }

  if (!result?.recordset || !Array.isArray(result.recordset)) {
    console.error("[check-otp-status] SP did not return recordset:", result);
    return NextResponse.json(
      { success: false, message: "Invalid database response." },
      { status: 500 }
    );
  }

  const spRow = result.recordset[0];

  const isExpired = spRow?.isExpired === 1;

  return NextResponse.json({
    success: true,
    isExpired,
  });
}
