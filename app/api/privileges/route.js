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
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: No session" }, { status: 401 });
    }

    let payload;
    try {
      const secretKey = new TextEncoder().encode(process.env.API_SECRET_KEY);
      const verified = await jwtVerify(token, secretKey);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ message: "Unauthorized: Invalid session" }, { status: 401 });
    }

    // ✅ Use authenticated userId instead of query param
    const loggedInUserId = payload.userId;
    if (!loggedInUserId) {
      return NextResponse.json({ message: "Unauthorized: No userId" }, { status: 401 });
    }
     
    const moduleId = request.headers.get("moduleId");
    const orgId = request.headers.get("orgId");
    const isSuperAdmin = Array.isArray(payload?.userRole)
      ? payload.userRole.some((r) => Number(r?.roleId) === SUPER_ADMIN_ROLE_ID)
      : false;

    if (isInvalid(loggedInUserId) || isInvalid(moduleId) || (!isSuperAdmin && isInvalid(orgId))) {
      return NextResponse.json(
        { message: "Headers are missing, undefined, or empty. Required: moduleId, orgId." },
        { status: 400 }
      );
    }

    if (isSuperAdmin) {
      const superPrivileges = await getAllModulePrivileges(moduleId);
      const response = NextResponse.json(
        { message: "Super Admin access", privileges: superPrivileges },
        { status: 200 }
      );
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      return response;
    }

    const result = await fetchPrivileges(loggedInUserId, moduleId, orgId);
    const { output, recordsets } = result;

    const privileges =
      recordsets && recordsets.length > 0
        ? await setPrivilege(recordsets[0])
        : [];

    const response = NextResponse.json(
      { message: output.outputmsg, privileges },
      { status: output.statuscode }
    );

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

async function fetchPrivileges(userRoleId, moduleId, orgId) {
  const inputParams = {
    userRole: userRoleId,
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
