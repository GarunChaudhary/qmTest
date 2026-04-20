// app/api/organization/checkOrgAssociation/route.js

import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const body = await request.json();
    const { OrgId } = body;

    // Step 1: Authorization check
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Token missing" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (token !== API_SECRET_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    // Step 2: Validation
    if (isInvalid(OrgId)) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid field: OrgId" },
        { status: 400 }
      );
    }

    // Step 3: Call stored procedure
    const result = await executeStoredProcedure("usp_CheckOrgUserAssociation", {
      OrgId,
    });

    const isAssociated = result.recordset?.[0]?.IsAssociated === 1;

    return NextResponse.json({
      success: true,
      isAssociated,
    });
  } catch (error) {
    console.error("Org association check failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error: " + error.message,
      },
      { status: 500 }
    );
  }
}
