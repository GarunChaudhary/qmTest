import { executeStoredProcedure } from "@/lib/mssqldb";
import OrganizationModel from "@/lib/models/organizationmodel";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const organizations = await getOrganizations();

    const orgData = buildHierarchy(organizations.recordsets[0]);
    const statusCounts = mapStatusCounts(organizations.recordsets[1]);

    const response = new Response(
      JSON.stringify({
        success: true,
        message: "Organizations fetched successfully",
        organizations: orgData,
        counts: statusCounts, // include status counts
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function mapStatusCounts(statusArray) {
  const statusMap = {
    Active: 0,
    Inactive: 0,
    "Soft Deleted": 0,
    Unknown: 0,
  };

  statusArray.forEach((item) => {
    statusMap[item.Status] = item.OrgCount;
  });

  return statusMap;
}

async function getOrganizations() {
  try {
    const result = await executeStoredProcedure("usp_GetOrganizations");
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw error;
  }
}

function buildHierarchy(records) {
  const orgMap = {};
  let rootNode = null;

  // First pass: create a map of id to organization node
  records.forEach((org) => {
    orgMap[org.id] = new OrganizationModel(
      org.id,
      org.Name,
      org.Description,
      org.parentId,
      [], // Initialize children array
      org.isActive // pass isActive from DB
    );
  });

  records.forEach((org) => {
    const node = orgMap[org.id];

    // Check if this is the root node (id === 1 and parentId === 1)
    if (org.id === 1 && org.parentId === 1) {
      rootNode = node; // Set as the root node
    } else {
      // For other nodes, find the parent and add to its children
      const parentNode = orgMap[org.parentId];

      if (parentNode) {
        parentNode.children.push(node);
      } else {
        console.warn(
          `Parent node with id ${org.parentId} not found for node ${org.id}`
        );
      }
    }
  });

  return rootNode ? [rootNode] : [];
}

// 🔧 Helper function to format the org counts
function formatOrgCounts(counts) {
  const result = {
    active: 0,
    inactive: 0,
    softDeleted: 0,
  };

  counts.forEach((item) => {
    switch (item.Status) {
      case "Active":
        result.active = item.OrgCount;
        break;
      case "Inactive":
        result.inactive = item.OrgCount;
        break;
      case "Soft Deleted":
        result.softDeleted = item.OrgCount;
        break;
      default:
        console.warn("Unknown status in orgCounts:", item.Status);
    }
  });

  return result;
}
