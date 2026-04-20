import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import PrivilegeModel from "@/lib/models/privilegeview";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { pathname } = new URL(request.url);
    const parts = pathname.split("/");
    const moduleId = parts[parts.length - 1]; // Get the last part, which is the moduleId

    if (!moduleId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Module ID is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const privileges = await getModulePrivileges(moduleId);

    const privilegesData = await setPrivilegesModel(privileges.recordsets[0]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Privileges fetched successfully",
        privileges: privilegesData,
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

    // Return error response if something goes wrong
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

async function getModulePrivileges(moduleId) {
  try {
    const inputParams = {
      moduleId,
    };

    const result = await executeStoredProcedure(
      "usp_ModulePrevilege",
      inputParams
    );
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw error;
  }
}

async function setPrivilegesModel(recordset) {
  try {
    const privileges = recordset.map(
      (privilege) =>
        new PrivilegeModel(
          privilege.ID,
          privilege.ModuleName,
          privilege.PrivilegeId,
          privilege.PrivilegeName,
          privilege.ModuleId
        )
    );
    return privileges;
  } catch (error) {
    console.error("Error occurred while transforming privileges model:", error);
    throw new Error("Failed to transform privileges data.");
  }
}
