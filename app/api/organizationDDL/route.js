import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentUserId = parseInt(request.headers.get("loggedInUserId"), 10);
    const parameters = { userId: currentUserId }
    const organizationDetails = await executeStoredProcedure("usp_GetOrganizations", parameters);
    if (organizationDetails.recordset && organizationDetails.recordset.length > 0) {
      const organizationList = buildOrganizationTree(organizationDetails.recordset);
      return NextResponse.json(
        { message: "Success", organizationList },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Organizations not found." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// Helper function to build the organization tree based on parent-child relationships
function buildOrganizationTree(organizations) {
  const map = new Map();
  const roots = [];

  // Create a map of all organizations
  organizations.forEach((org) => {
    const { id, Name, Description, isActive, parentId } = org;
    map.set(id, {
      id,
      label: Name,
      description: Description,
      value: id,
      isActive,
      isDisabled: isActive === 0, // ✅ Disable if inactive
      children: [],
    });
  });

  // Link each organization to its parent or mark it as a root
  organizations.forEach((org) => {
    const { id, parentId } = org;
    const node = map.get(id);
    if (parentId === null || parentId === 0 || parentId === id || !map.has(parentId)) {
      // Add as a root node
      roots.push(node);
    } else {
      // Link as a child of its parent
      const parent = map.get(parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return roots;
}
