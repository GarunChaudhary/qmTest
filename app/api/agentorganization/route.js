import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  TotalRecords,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";
import { setAgentOrganizationModule } from "@/lib/models/agentOrganization";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";

const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const pageNo = parseInt(url.searchParams.get("page") || 1);
    const rowCountPerPage = parseInt(url.searchParams.get("perPage") || 10);
    const search = url.searchParams.get("search") || null;
    const queryType = parseInt(url.searchParams.get("queryType") || 0);
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
    if (isInvalid(currentUserId)) {
      return NextResponse.json(
        { message: "Headers are missing or invalid." },
        { status: 400 }
      );
    }
    const hasViewPermission = await checkUserPrivilege(
      currentUserId,
      MODULES.AGENT_ORG,
      PRIVILEGES.VIEW
    );

    if (!hasViewPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: No permission to view users.",
        },
        { status: 403 }
      );
    }
    const organizationMappingDetails = await getOrganizationMappingDetails(
      pageNo,
      rowCountPerPage,
      search,
      currentUserId,
      queryType
    );

    if (organizationMappingDetails.recordsets.length > 0) {
      if (queryType === 0) {
        const totalRecord = await TotalRecords(
          organizationMappingDetails.recordsets[1]
        );
        const mappings = await setAgentOrganizationModule(
          organizationMappingDetails.recordsets[0]
        );

        return NextResponse.json(
          {
            message: organizationMappingDetails.output.outputmsg,
            totalRecord,
            mappings: mappings,
          },
          { status: organizationMappingDetails.output.statuscode }
        );
      } else {
        const mappings = await setAgentOrganizationModule(
          organizationMappingDetails.recordsets[0]
        );
        return NextResponse.json(
          {
            message: organizationMappingDetails.output.outputmsg,
            mappings: mappings,
          },
          { status: organizationMappingDetails.output.statuscode }
        );
      }
    }

    return NextResponse.json(
      { message: organizationMappingDetails.output.outputmsg },
      { status: organizationMappingDetails.output.statuscode }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const {
      page = 1,
      perPage = 10,
      search,
      queryType = 0,
      currentUserId,
    } = await request.json();

    if (isInvalid(currentUserId)) {
      return NextResponse.json(
        { message: "Request body is invalid." },
        { status: 400 }
      );
    }

    const organizationMappingDetails = await getOrganizationMappingDetails(
      page,
      perPage,
      search,
      currentUserId,
      queryType
    );

    if (organizationMappingDetails.recordsets.length > 0) {
      if (queryType === 0) {
        const totalRecord = await TotalRecords(
          organizationMappingDetails.recordsets[1]
        );
        const mappings = await setAgentOrganizationModule(
          organizationMappingDetails.recordsets[0]
        );

        return NextResponse.json(
          {
            message: organizationMappingDetails.output.outputmsg,
            totalRecord,
            mappings: mappings,
          },
          { status: organizationMappingDetails.output.statuscode }
        );
      } else {
        const mappings = await setAgentOrganizationModule(
          organizationMappingDetails.recordsets[0]
        );

        return NextResponse.json(
          {
            message: organizationMappingDetails.output.outputmsg,
            mappings: mappings,
          },
          { status: organizationMappingDetails.output.statuscode }
        );
      }
    }

    return NextResponse.json(
      { message: organizationMappingDetails.output.outputmsg },
      { status: organizationMappingDetails.output.statuscode }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getOrganizationMappingDetails(
  pageNo,
  rowCountPerPage,
  search,
  currentUserId,
  queryType
) {
  const inputParams = {
    pageNo: pageNo,
    rowCountPerPage: rowCountPerPage,
    search: search,
    currentUserId: currentUserId,
    querytype: queryType,
  };

  const result = await executeStoredProcedure(
    "usp_GetOrgAgentMappingDetails",
    inputParams,
    outputmsgWithStatusCodeParams
  );

  return result;
}
