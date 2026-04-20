// app/api/sourcesDDL/route.js
import { isInvalid } from "@/lib/generic";
import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const loggedInUserId = request.headers.get("loggedInUserId");

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Token missing",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.split(" ")[1];

    if (token !== API_SECRET_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Invalid token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (isInvalid(loggedInUserId)) {
      return NextResponse.json(
        { message: "Logged-in user ID is missing or invalid." },
        { status: 400 },
      );
    }

    const data = await executeStoredProcedure("usp_GetSources");
    const sources = data.recordsets[0];

    return NextResponse.json({
      success: true,
      message: "Sources fetched successfully",
      data: sources,
    });
  } catch (error) {
    console.error("Error occurred while fetching sources:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
