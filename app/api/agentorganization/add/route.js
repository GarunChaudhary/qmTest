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

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const requestBody = await request.json();
    const { organizationId, agentId, currentUserId } = requestBody;

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

    const hasAddPermission = await checkUserPrivilege(
      currentUserId,
      MODULES.AGENT_ORG, // → this will be 2
      PRIVILEGES.CREATE // → this will be 2
    );

    if (!hasAddPermission) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized: You do not have permission to add Agent Organization.",
        },
        { status: 403 }
      );
    }

    if (
      isInvalid(organizationId) ||
      isInvalid(agentId) ||
      isInvalid(currentUserId)
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid input. Check organizationId, agentId, and currentUserId.",
        }
        //{ status: 400 }
      );
    }

    const organizationIds =
      organizationId?.length > 0
        ? JSON.stringify(organizationId.map((org) => ({ orgId: org.orgId })))
        : "[]";

    const result = await insertOrgAgentMapping(
      organizationIds,
      agentId,
      currentUserId
    );

    if (!result || !result.output) {
      return NextResponse.json(
        { message: "Unexpected error during execution." }
        //{ status: 500 }
      );
    }

    return NextResponse.json(
      { message: result.output.outputmsg }
      // { status: result.output.statuscode }
    );
  } catch (error) {
    console.error("Error during POST request:", error);

    return NextResponse.json(
      { message: "An error occurred. Please try again." }
      //{ status: 500 }
    );
  }
}

async function insertOrgAgentMapping(organizationIds, agentId, currentUserId) {
  const inputParams = {
    organizationIds,
    agentId,
    creationBy: currentUserId,
  };

  const result = await executeStoredProcedure(
    "usp_InsertOrgAgentMapping",
    inputParams,
    outputmsgWithStatusCodeParams
  );

  return result;
}
