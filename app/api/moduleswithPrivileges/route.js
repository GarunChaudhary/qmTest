import { NextResponse } from "next/server";
import { isInvalid } from "@/lib/generic";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { setPrivilege } from "@/lib/models/moduleswithprivileges";
export const dynamic = "force-dynamic";
import { jwtVerify } from "jose";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export async function GET(request) {
  try {
    const token = request.cookies.get("sessionToken")?.value;
    let isSuperAdmin = false;
    let verifiedUserId = null;
    if (token) {
      try {
        const secretKey = new TextEncoder().encode(process.env.API_SECRET_KEY);
        const verified = await jwtVerify(token, secretKey);
        verifiedUserId = verified?.payload?.userId ?? null;
        const roles = verified?.payload?.userRole || [];
        isSuperAdmin = Array.isArray(roles)
          ? roles.some((r) => Number(r?.roleId) === SUPER_ADMIN_ROLE_ID)
          : false;
      } catch {
        isSuperAdmin = false;
      }
    }

    const loggedInUserRoleId =
      request.headers.get("loggedInUserId") || verifiedUserId || null;
    const moduleId = request.headers.get("moduleId");
    const orgId = request.headers.get("orgId");
    if (
      isInvalid(loggedInUserRoleId) ||
      isInvalid(moduleId) ||
      (!isSuperAdmin && isInvalid(orgId))
    ) {
      return NextResponse.json(
        {
          message: "Headers are missing or undefined or empty. Required: loggedInUserId, moduleId, orgId.",
        },
        { status: 400 }
      );
    }

    if (isSuperAdmin) {
      const superPrivileges = await getAllModulePrivileges(moduleId);
      return NextResponse.json(
        { message: "Super Admin access", PrivilegeList: superPrivileges },
        { status: 200 }
      );
    }

    const result = await getPrivileges(loggedInUserRoleId, moduleId, orgId);

    const recordsetsCount = result.recordsets.length;
    var PrivilegeList = [];
    if (recordsetsCount > 0) {
      PrivilegeList = await setPrivilege(result.recordsets[0]);
    }

    return NextResponse.json(
      { message: result.output.outputmsg, PrivilegeList },
      { status: result.output.statuscode }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getPrivileges(loggedInUserRoleId, moduleId, orgId) {
  const inputParams = {
    userRole: loggedInUserRoleId,
    moduleId: moduleId,
    orgId: orgId,
  };
  const result = await executeStoredProcedure(
    "sp_getRoleModulesWithPrivileges",
    inputParams,
    outputmsgWithStatusCodeParams
  );
  return result;
}

async function getAllModulePrivileges(moduleId) {
  const result = await executeStoredProcedure(
    "usp_ModulePrevilege",
    { moduleId },
    {}
  );
  const rows = result?.recordsets?.[0] || [];
  return rows.map((row) => ({
    RoleId: SUPER_ADMIN_ROLE_ID,
    ModuleId: row.ModuleId ?? Number(moduleId),
    PrivilegeId: row.PrivilegeId,
    user_role: "Super Admin",
  }));
}
