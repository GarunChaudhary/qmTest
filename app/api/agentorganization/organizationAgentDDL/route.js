import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

// Main API Handler
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const loggedInUserId = request.headers.get("loggedInUserId");

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

    if (!loggedInUserId) {
      console.error("Missing or undefined loggedInUserId in headers");
      return NextResponse.json(
        {
          message:
            "Headers are missing or undefined: loggedInUserId is required.",
        },
        { status: 400 }
      );
    }

    // Fetch organizations using stored procedure
    const organizationDetails = await getAllOrganizationsDDL(loggedInUserId);

    // Validate and process the result
    if (
      organizationDetails.recordset &&
      organizationDetails.recordset.length > 0
    ) {
      const organizationList = buildOrganizationTree(
        organizationDetails.recordset
      );

      return NextResponse.json(
        {
          message:
            organizationDetails.output.outputmsg ||
            "Organization dropdown returned successfully.",
          organizationList,
        },
        { status: organizationDetails.output.statuscode || 200 }
      );
    } else {
      console.warn("No organizations found for user:", loggedInUserId);
      return NextResponse.json(
        { message: "No organizations found.", organizationList: [] },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in OrganizationDDL API:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to execute the stored procedure
async function getAllOrganizationsDDL(loggedInUserId) {
  const inputParams = { currentUserid: loggedInUserId };
  const outputParams = [
    { name: "outputmsg", type: "nvarchar", value: "" },
    { name: "statuscode", type: "int", value: 0 },
  ];

  const result = await executeStoredProcedure(
    "usp_OrgDDLForAgentOrgMapping",
    inputParams,
    outputParams
  );

  return result;
}

function buildOrganizationTree(organizations) {
  const map = new Map();
  const roots = [];

  // Step 1: Create a map of all nodes
  organizations.forEach((org) => {
    const { orgId, org_name, parentId } = org;

    if (!orgId || !org_name) {
      console.warn("Skipping invalid organization node:", org);
      return;
    }

    map.set(orgId, {
      id: orgId,
      name: org_name,
      parentId,
      children: [],
    });
  });

  // Step 2: Build the tree structure
  organizations.forEach((org) => {
    const { orgId, parentId } = org;
    const node = map.get(orgId);

    // Treat as root if parentId === orgId or no valid parent exists
    if (!parentId || parentId === orgId || !map.has(parentId)) {
      roots.push(node);
    } else {
      // Attach to its parent
      const parent = map.get(parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        console.warn(`Orphan node detected (no parent found):`, node);
      }
    }
  });

  return roots;
}
