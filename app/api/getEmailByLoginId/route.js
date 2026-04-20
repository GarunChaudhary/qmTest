// app/api/getEmailByLoginId/route.js

import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export async function POST(request) {
  const { loginId } = await request.json();

  if (!loginId) {
    return NextResponse.json(
      { success: false, message: "Login ID is required" },
      { status: 200 }
    );
  }

  const result = await executeStoredProcedure("usp_GetEmailByLoginId", {
    loginId,
  });

  const [spResponse] = result.recordset || [];

  if (!spResponse) {
    return NextResponse.json(
      { success: false, message: "Login ID does not exist" },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      userId: spResponse.userId,
      email: spResponse.email || "", // "" if null
    },
    { status: 200 }
  );
}
