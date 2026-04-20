// app/api/users/delete/bulk/route.js

import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    // 🔐 Step 1: Validate Authorization Header
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
    // 🧾 Step 2: Parse and validate request body
    const { userIds, currentUserId } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "No user IDs provided for deletion." },
        { status: 400 },
      );
    }

    if (isInvalid(currentUserId)) {
      return NextResponse.json(
        { message: "Invalid current user ID." },
        { status: 400 },
      );
    }

    // 🔐 Step 3: Privilege check
    const hasDeletePermission = await checkUserPrivilege(
      currentUserId,
      MODULES.USER_MANAGEMENT,
      PRIVILEGES.DELETE,
    );

    if (!hasDeletePermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: You do not have permission to delete users.",
        },
        { status: 403 },
      );
    }

    // 🧮 Step 4: Convert user ID array to comma-separated string
    const userIdsString = userIds.join(",");

    // ⚙️ Step 5: Execute the bulk delete stored procedure
    const result = await executeStoredProcedure(
      "usp_DeleteUserBulk",
      {
        userIds: userIdsString,
        deletedBy: currentUserId,
      },
      outputmsgWithStatusCodeParams,
    );

    // ⭐ AUDIT: USER DELETE
    const userName = request.headers.get("userName");

    await logAudit({
      userId: currentUserId,
      userName: userName,
      actionType: "DELETE_USER",
      description: `User deleted users: ${userIdsString}`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    // 🧾 Step 6: Validate response
    if (!result || !result.output) {
      return NextResponse.json(
        { message: "Error occurred while processing the request." },
        { status: 500 },
      );
    }

    // ✅ Step 7: Return success message
    return NextResponse.json({
      message: result.output.outputmsg,
      statuscode: result.output.statuscode,
    });
  } catch (error) {
    console.error("Bulk delete API error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error." },
      { status: 500 },
    );
  }
}
