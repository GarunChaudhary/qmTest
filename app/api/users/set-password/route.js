// app/api/users/set-password/route.js

import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export async function POST(request) {
  try {
    const { userId, newPassword } = await request.json();
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token || token !== process.env.NEXT_PUBLIC_API_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized request." },
        { status: 401 }
      );
    }

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Missing userId or password." },
        { status: 400 }
      );
    }

    const result = await executeStoredProcedure(
      "usp_SetPassword",
      {
        userId: parseInt(userId),
        newPassword,
      },
      {}
    );

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
