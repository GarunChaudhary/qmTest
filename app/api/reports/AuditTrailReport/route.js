// app/api/reports/AuditTrailReport/route.js

// app/api/reports/AuditTrailReport/route.js
import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const loggedInUserId = parseInt(request.headers.get("loggedInUserId"), 10);

    const { StartDate, EndDate, pageNo, rowCountPerPage, queryType } =
      await request.json();

    // 🔐 Authorization check
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];

    if (token !== API_SECRET_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Invalid Token" },
        { status: 401 },
      );
    }

    if (isInvalid(loggedInUserId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user" },
        { status: 400 },
      );
    }

    // 🔐 Privilege check
    const hasViewPermission = await checkUserPrivilege(
      loggedInUserId,
      MODULES.REPORTS,
      PRIVILEGES.VIEW,
    );

    if (!hasViewPermission) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const parameters = {
      userId: loggedInUserId,
      StartDate,
      EndDate,
      pageNo,
      rowCountPerPage,
      querytype: queryType,
    };

    const result = await executeStoredProcedure(
      "usp_AuditTrailReport",
      parameters,
    );

    const auditData = result?.recordsets?.[0] || [];
    const totalCount =
      queryType === 0 ? result?.recordsets?.[1]?.[0]?.TotalCount || 0 : 0;

    return NextResponse.json({
      success: true,
      data: {
        auditData,
        totalCount,
      },
    });
  } catch (error) {
    console.error("AuditTrailReport error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
