import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const agentId = params.id;
    let { organizationIds, currentUserId } = await request.json();

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

    const updatePermission = await checkUserPrivilege(
      currentUserId,
      MODULES.AGENT_ORG, // → this will be 2
      PRIVILEGES.EDIT // → this will be 2
    );

    if (!updatePermission) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized: You do not have permission to Edit Agent organization.",
        },
        { status: 403 }
      );
    }

    if (Array.isArray(organizationIds)) {
      organizationIds = JSON.stringify(organizationIds);
    }

    if (
      isInvalid(agentId) ||
      isInvalid(organizationIds) ||
      isInvalid(currentUserId)
    ) {
      return NextResponse.json(
        { message: "Invalid request. Check your inputs." }
        //{ status: 400 }
      );
    }

    const result = await executeStoredProcedure(
      "usp_UpdateOrgAgentMapping",
      {
        agentId,
        updatedBy: currentUserId,
        organizationIds,
      },
      outputmsgWithStatusCodeParams
    );

    return NextResponse.json({ message: result.output.outputmsg });
  } catch (error) {
    console.error("Error encountered during POST request:", error.message);

    return NextResponse.json(
      { message: error.message || "An unexpected error occurred" }
      //{ status: 500 }
    );
  }
}
