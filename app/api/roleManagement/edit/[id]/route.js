// app/api/roleManagement/edit/[id]/route.js

import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { isInvalid } from "@/lib/generic";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

// 🧠 Add smartCapitalize here too
const smartCapitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => {
      if (word === word.toUpperCase()) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export async function POST(request, { params }) {
  try {
    const roleId = parseInt(params.id);

    if (isInvalid(roleId)) {
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
    if (!isSuperAdmin && roleId === SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to edit Super Admin role.",
          statusCode: 403,
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    let { user_role, Description, ModifiedBy, userName } = body;

    if (!user_role?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Role name cannot be empty.",
          statusCode: 200,
        },
        { status: 200 },
      );
    }

    // Apply smartCapitalize to name & description
    user_role = smartCapitalize(user_role);
    if (Description) Description = smartCapitalize(Description);

    const result = await updateRoleById(
      roleId,
      user_role,
      Description,
      ModifiedBy,
    );
    const { StatusCode, Message } = result.recordset[0];

    if (StatusCode === 200) {
      await logAudit({
        userId: ModifiedBy,
        userName: userName,
        actionType: "ROLE_UPDATED",
        description: `${userName} updated the role '${user_role}'`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }

    return NextResponse.json(
      {
        success: StatusCode === 200,
        message: Message,
        statusCode: StatusCode,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in EDIT role API:", error);
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

async function updateRoleById(id, user_role, Description, ModifiedBy) {
  const inputParams = {
    RoleIdToUpdate: id,
    RoleName: user_role,
    RoleDescription: Description || "",
    ModifiedBy: ModifiedBy || null, // ✅ new parameter
  };

  return executeStoredProcedure(
    "usp_UpdateRole",
    inputParams,
    outputmsgWithStatusCodeParams,
  );
}
