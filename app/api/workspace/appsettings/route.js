import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Token missing" },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];

    if (token !== API_SECRET_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      orgId,
      intervalInMinute,
      tokenUrl,
      clientId,
      clientSecret,
      redirectUri,
      baseUrl,
      token: accessToken,
      tokenExpiresInSeconds,
      refreshToken,
      refreshTokenExpiresInSec,
      timezone,
      destDirectory,
      fileFormat,
      folderStructure,
      workspaceid,
      startTime,
      frequencyInMinutes,
    } = body;

    const result = await executeStoredProcedure("usp_SaveAppSettings", {
      orgId,
      intervalInMinute,
      tokenUrl,
      clientId,
      clientSecret,
      redirectUri,
      baseUrl,
      token: accessToken,
      tokenExpiresInSeconds,
      refreshToken,
      refreshTokenExpiresInSec,
      timezone,
      destDirectory,
      fileFormat,
      folderStructure,
      workspaceid,
      startTime,
      frequencyInMinutes,
    });

    return NextResponse.json({
      success: true,
      message: "Configuration saved successfully",
      data: result.recordset || [],
    });
  } catch (error) {
    console.error("Error saving app settings:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
