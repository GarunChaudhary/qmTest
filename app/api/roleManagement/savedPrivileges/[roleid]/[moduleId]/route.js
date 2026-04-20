import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import PrivilegeModel from "@/lib/models/privilegeview";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { pathname } = new URL(request.url);
    const parts = pathname.split("/");
    const roleId = parts[parts.length - 2]; // Second last part is the roleId
    const moduleId = parts[parts.length - 1]; // Last part is the moduleId
    const orgId = request.headers.get("orgId");

    if (!roleId || !moduleId || !orgId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Role ID, Module ID, and Org ID are required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const isSuperAdmin = await isSuperAdminFromRequest();
    if (!isSuperAdmin && Number(roleId) === SUPER_ADMIN_ROLE_ID) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "You are not allowed to access Super Admin privileges.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch both the privileges and saved privileges in parallel
    const [privilegesResult, savedPrivilegesResult] = await Promise.all([
      executeStoredProcedure("usp_ModulePrevilege", { moduleId }),
      executeStoredProcedure("usp_GetSavedPrivilegesForRoleAndModule", {
        roleId,
        moduleId,
        orgId,
      }),
    ]);

    const privileges = await setPrivilegesModel(privilegesResult.recordsets[0]);
    const savedPrivileges = savedPrivilegesResult.recordset || [];

    return new Response(
      JSON.stringify({
        success: true,
        message: "Combined privileges data fetched successfully",
        privileges,
        savedPrivileges,
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

async function setPrivilegesModel(recordset) {
  try {
    return recordset.map(
      (privilege) =>
        new PrivilegeModel(
          privilege.ID,
          privilege.ModuleName,
          privilege.PrivilegeId,
          privilege.PrivilegeName,
          privilege.ModuleId
        )
    );
  } catch (error) {
    console.error("Error occurred while transforming privileges model:", error);
    throw new Error("Failed to transform privileges data.");
  }
}
