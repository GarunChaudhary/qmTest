import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

// 🧠 Add smartCapitalize function here
const smartCapitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => {
      if (word === word.toUpperCase()) return word; // Leave acronyms like HR, IT
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export async function POST(request) {
  try {
    const { newRole, Description, userId, userName } = await request.json();

    const isInvalid = (value) =>
      value === undefined || value === null || value === "";
    if (isInvalid(newRole)) {
      return NextResponse.json(
        { success: false, message: "Role name is undefined or empty." },
        { status: 400 },
      );
    }
    const isSuperAdmin = await isSuperAdminFromRequest();
    // Apply smart capitalization to both fields
    const formattedRole = smartCapitalize(newRole);
    const formattedDesc = Description ? smartCapitalize(Description) : "";

    if (!isSuperAdmin && formattedRole.toLowerCase() === "super admin") {
      return NextResponse.json(
        { success: false, message: "You are not allowed to create Super Admin role." },
        { status: 403 },
      );
    }
    // Try to create the role using the stored procedure
    const result = await CreateRole(formattedRole, formattedDesc, userId);

    if (parseInt(result.output.statuscode) === 200) {
      const newRoleData = result.recordset ? result.recordset[0] : null; // Get the first recordset item if available

      // ⭐ Audit log for role creation
      await logAudit({
        userId: userId,
        userName: userName, // optional if username not available
        actionType: "ROLE_CREATED",
        description: `${userName} created a new role '${formattedRole}'`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });

      return NextResponse.json(
        {
          success: true,
          message: result.output.outputmsg,
          newRole: newRoleData, // Include the newly created role's data here
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { success: false, message: result.output.outputmsg },
        // { status: result.output.statuscode }
      );
    }
  } catch (error) {
    console.error("Internal server error:", error);
    if (error instanceof RangeError) {
      return NextResponse.json(
        { success: false, message: error.message },
        // { status: 400 }
      );
    }
  }
}

async function CreateRole(newRole, Description, userId) {
  try {
    const inputParams = {
      newRole,
      Description,
      userId,
    };
    const result = await executeStoredProcedure(
      "usp_InsertUserRole",
      inputParams,
      outputmsgWithStatusCodeParams,
    );
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw new Error("Failed to create the role.");
  }
}
