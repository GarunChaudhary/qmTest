import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import sql from "mssql";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const {
      privilegesToSave,
      uncheckedModuleIds,
      roleid,
      roleName,
      userId,
      userName,
      orgId,
    } = await request.json();

    const isSuperAdmin = await isSuperAdminFromRequest();
    if (!isSuperAdmin && Number(roleid) === SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { success: false, message: "You are not allowed to modify Super Admin privileges." },
        { status: 403 },
      );
    }

    if (!privilegesToSave && !uncheckedModuleIds) {
      return NextResponse.json(
        {
          success: false,
          message: "No privileges selected for saving or modules to delete.",
        },
        { status: 400 },
      );
    }

    const tvpData =
      privilegesToSave?.map((privilege) => ({
        roleid: privilege.roleid,
        ModuleId: privilege.moduleId,
        PrivilegeId: privilege.privilegeId,
        OrgId: privilege.orgId || orgId || null,
      })) || [];

    const result = await saveRoleModulePrivileges(
      tvpData,
      uncheckedModuleIds,
      roleid,
      orgId,
    );

    if (parseInt(result.output.statuscode) === 200) {
      await logAudit({
        userId,
        userName: userName,
        actionType: "ASSIGN_PRIVILEGES",
        description: `${userName} added privileges to role '${roleName}'`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
      return NextResponse.json(
        { success: true, message: result.output.outputmsg },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { success: false, message: result.output.outputmsg },
        { status: result.output.statuscode },
      );
    }
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 },
    );
  }
}

async function saveRoleModulePrivileges(
  tvpData,
  uncheckedModuleIds,
  roleid,
  orgId
) {
  try {
    const jsonData = JSON.stringify(tvpData);
    const modulesToDelete = JSON.stringify(uncheckedModuleIds);

    const inputParams = {
      RoleModulePrivileges: jsonData,
      ModulesToDelete: modulesToDelete,
      roleid: roleid,
      OrgId: orgId,
    };

    const result = await executeStoredProcedure(
      "usp_InsertRoleModulesWithPrivileges",
      inputParams,
      outputmsgWithStatusCodeParams,
    );

    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw new Error("Failed to save role-module-privilege mappings.");
  }
}
