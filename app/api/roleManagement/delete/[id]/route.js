import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { isInvalid } from "@/lib/generic";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const RoleIdToDelete = parseInt(params.id);

    if (isInvalid(RoleIdToDelete)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or missing role ID.",
          statusCode: 400,
        },
        { status: 400 },
      );
    }

    const isSuperAdmin = await isSuperAdminFromRequest();
    if (!isSuperAdmin && RoleIdToDelete === SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to delete Super Admin role.",
          statusCode: 403,
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, userName, roleName } = body;

    const result = await deleteRoleById(RoleIdToDelete);
    const { StatusCode, Message } = result.recordset[0];

    // ⭐ AUDIT LOG
    if (StatusCode === 200) {
      await logAudit({
        userId: userId,
        userName: userName,
        actionType: "ROLE_DELETED",
        description: `${userName} deleted the role '${roleName}'`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }

    return NextResponse.json(
      {
        success: StatusCode === 200,
        message: Message,
        statusCode: StatusCode, // ✅ include this like organization
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in DELETE role API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        statusCode: 500,
      },
      { status: 500 },
    );
  }
}

async function deleteRoleById(id) {
  const inputParams = {
    RoleIdToDelete: id,
  };

  return executeStoredProcedure(
    "usp_DeleteRole",
    inputParams,
    outputmsgWithStatusCodeParams,
  );
}
