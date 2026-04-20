import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const { organizationId, agentIds, currentUserId } = await request.json();

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

    if (
      isInvalid(organizationId) ||
      isInvalid(agentIds) ||
      isInvalid(currentUserId)
    ) {
      return NextResponse.json(
        { message: "Request body could not be read properly." }
        // { status: 400 }
      );
    }

    const organizationIds =
      organizationId?.length > 0
        ? JSON.stringify(organizationId.map((org) => ({ orgId: org.orgId })))
        : "[]";

    const result = await insertOrganizationAgentMappingInBulk(
      organizationIds,
      agentIds,
      currentUserId
    );

    if (!result || !result.output) {
      return NextResponse.json(
        { message: "Unexpected error during execution." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: result.output.outputmsg }
      //{ status: result.output.statuscode }
    );
  } catch (error) {
    console.error("Error during POST request:", error);

    return NextResponse.json(
      { message: "An error occurred. Please try again." }
      //{ status: 500 }
    );
  }
}

async function insertOrganizationAgentMappingInBulk(
  organizationIds,
  agentIds,
  currentUserId
) {
  const formattedAgentIds = Array.isArray(agentIds)
    ? JSON.stringify(agentIds.map((id) => ({ agentId: id })))
    : agentIds;

  const inputParams = {
    organizationIds,
    agentsIds: formattedAgentIds,
    creationBy: currentUserId,
  };

  const result = await executeStoredProcedure(
    "usp_InsertOrgAgentMappingInBulk",
    inputParams,
    outputmsgWithStatusCodeParams
  );

  return result;
}
