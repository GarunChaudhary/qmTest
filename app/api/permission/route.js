import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { setPermissionModel } from "@/lib/models/permission";
import { isInvalid } from "@/lib/generic";
import { jwtVerify } from "jose";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

// Ensure the route is dynamic
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // Extract userId from the request query

    const token = request.cookies.get("sessionToken")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized, no token found." },
        { status: 401 }
      );
    }

    let payload;
    try {
      const secretKey = new TextEncoder().encode(process.env.API_SECRET_KEY);
      const verified = await jwtVerify(token, secretKey);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json(
        { message: "Unauthorized, invalid token." },
        { status: 401 }
      );
    }
    // Headers (if necessary for authentication, etc.)
    const userId = payload.userId;
    const isSuperAdmin = Array.isArray(payload?.userRole)
      ? payload.userRole.some((r) => Number(r?.roleId) === SUPER_ADMIN_ROLE_ID)
      : false;

    // Validate the userId query parameter
    if (isInvalid(userId)) {
      return NextResponse.json(
        { message: "UserId is required in the query parameters." },
        { status: 400 }
      );
    }

    const orgId = request.headers.get("orgId");
    if (!isSuperAdmin && isInvalid(orgId)) {
      return NextResponse.json(
        { message: "Headers are missing, undefined, or empty. Required: orgId." },
        { status: 400 }
      );
    }

    if (isSuperAdmin) {
      const permissionModel = await getSuperAdminPermissionModel();
      const response = NextResponse.json(
        { message: "Super Admin access", permissionModel },
        { status: 200 }
      );
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      return response;
    }

    // Fetch permission model details for the specific userId
    const permissionModelDetails = await getPermissionModelDetails(userId, orgId);

    // Check if records were returned
    if (permissionModelDetails.recordsets.length > 0) {
      // Map the recordset to the PermissionModel class
      const permissionModel = await setPermissionModel(
        permissionModelDetails.recordsets[0]
      );

      // Return a success response with the permission model data
      const response = NextResponse.json(
        {
          message: permissionModelDetails.output?.outputmsg || "Success",
          permissionModel,
        },
        {
          status: permissionModelDetails.output?.statuscode || 200,
        }
      );
      // Add Cache-Control headers
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );

      return response;
    }
    // Return a "no result" response if no records were found
    return NextResponse.json(
      {
        message: permissionModelDetails.output?.outputmsg || "No result found",
      },
      {
        status: permissionModelDetails.output?.statuscode || 400,
      }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error || " + error.message },
      { status: 500 }
    );
  }
}

async function getPermissionModelDetails(userId, orgId) {
  const result = await executeStoredProcedure(
    "usp_GetPrivilegesByUserid",
    { UserId: userId, OrgId: orgId },
    {}
  );
  return result;
}

async function getSuperAdminPermissionModel() {
  const modulesResult = await executeStoredProcedure(
    "usp_GetNavbarModules",
    {},
    {}
  );
  const modules = modulesResult?.recordsets?.[0] || [];
  return modules.map((m) => ({
    id: 0,
    roleId: SUPER_ADMIN_ROLE_ID,
    moduleId: m.ID,
    privilegeId: 1,
  }));
}
