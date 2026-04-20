import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import ModulesModel from "@/lib/models/moduleview";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const id = params.id;

    // 🔐 Step 2: Check if token is missing or incorrect
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
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid id provided to fetch the roleManagement record.",
        },
        { status: 400 }
      );
    }

    const isSuperAdmin = await isSuperAdminFromRequest();
    if (!isSuperAdmin && Number(id) === SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to access Super Admin role.",
          modules: [],
        },
        { status: 403 }
      );
    }

    const modules = await getModules(id);

    const recordset = modules?.recordsets?.[0];

    if (!recordset || recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: modules.output?.outputmsg || "No modules found.",
          modules: [],
        },
        { status: 404 }
      );
    }

    const modulesData = await setModulesModel(recordset);

    return NextResponse.json(
      {
        success: true,
        message: "Modules fetched successfully",
        modules: modulesData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error occurred while processing GET request:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getModules(id) {
  try {
    const inputParams = {
      id: id,
    };
    const result = await executeStoredProcedure(
      "usp_GetModules",
      inputParams,
      outputmsgWithStatusCodeParams
    );
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw error;
  }
}

async function setModulesModel(recordset) {
  if (!Array.isArray(recordset)) {
    throw new Error("Invalid recordset passed to setModulesModel");
  }

  return recordset.map(
    (module) => new ModulesModel(module.ID, module.ModuleName)
  );
}
