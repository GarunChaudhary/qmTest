import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb"; // Assuming this exists as a helper to run stored procedures
import RolesModel from "@/lib/models/roleManagement"; // Assuming this model exists or you can create it
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request) {
  try {
    // Fetch roles from the database
    const authHeader = request.headers.get("authorization");
    const loggedInUserId = request.headers.get("loggedInUserId");

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Token missing",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.split(" ")[1];

    if (token !== API_SECRET_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Invalid token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (isInvalid(loggedInUserId)) {
      return NextResponse.json(
        { message: "Logged-in user ID is missing or invalid." },
        { status: 400 }
      );
    }

    const hasViewPermission = await checkUserPrivilege(
      loggedInUserId,
      MODULES.ROLE_MANAGEMENT,
      PRIVILEGES.VIEW
    );

    if (!hasViewPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: No permission to view roles.",
        },
        { status: 403 }
      );
    }

    const roles = await getRoles();

    let rolesData = await setRolesModel(roles.recordsets[0]);
    const isSuperAdmin = await isSuperAdminFromRequest();
    if (!isSuperAdmin) {
      rolesData = rolesData.filter((r) => Number(r.roleId) !== SUPER_ADMIN_ROLE_ID);
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        message: "Roles fetched successfully",
        roles: rolesData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error occurred while processing GET request:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

async function getRoles() {
  // Execute the stored procedure to fetch roles
  try {
    const result = await executeStoredProcedure("usp_GetUserRoles");
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw error; // Propagate error to be handled in the GET function
  }
}

async function setRolesModel(recordset) {
  try {
    const roles = await recordset.map(
      (role) => new RolesModel(role.roleId, role.roleName, role.Description)
    );
    return roles;
  } catch (error) {
    console.error("Error occurred while transforming roles model:", error);
    throw new Error("Failed to transform roles data.");
  }
}
