import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const agentid = params.id;
    const currentUserId = request.headers.get("loggedInUserId");

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
    if (isInvalid(agentid) || isInvalid(currentUserId)) {
      return NextResponse.json(
        {
          message: "Request headers or parameter could not be read properly.",
        }
        //{ status: 400 }
      );
    }

    const agentOrganizationDetails = await getAgentOrganizationDetailsById(
      agentid,
      currentUserId
    );

    if (
      agentOrganizationDetails?.recordsets &&
      agentOrganizationDetails.recordsets[0]?.length > 0
    ) {
      const agentDetails = agentOrganizationDetails.recordsets[0];
      const agent = agentDetails[0];
      const agents = {
        agentId: agent.agentId,
        activeStatus: agent.activeStatus,
        organizations: agent.orgIds
          ? agent.orgIds.split(",").map((orgId, index) => ({
              orgId: parseInt(orgId, 10),
              orgName: agent.organizationName.split(",")[index],
            }))
          : [],
      };
      return NextResponse.json({
        message: agentOrganizationDetails.output.outputmsg,
        agents,
      });
    } else {
      return NextResponse.json(
        { message: "Organization not found." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching agent organization details:", error);
    return NextResponse.json(
      { message: error.message }
      //, { status: 500 }
    );
  }
}

async function getAgentOrganizationDetailsById(agentid, userId) {
  const inputParams = {
    id: agentid,
    currentUserId: userId,
  };

  const result = await executeStoredProcedure(
    "usp_GetOrgAgentMappingDetailsById",
    inputParams,
    outputmsgWithStatusCodeParams
  );
  return result;
}
