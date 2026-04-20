export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { isInvalid } from "@/lib/generic";
import { executeStoredProcedure, outputmsgWithStatusCodeParams } from "@/lib/mssqldb";

export async function GET(request) {
  try {
    // Get the logged-in user ID from request headers
    const loggedInUserId = parseInt(request.headers.get("loggedInUserId"), 10);

    if (isInvalid(loggedInUserId)) {
      return NextResponse.json(
        { message: "LoggedInUserId header is missing, undefined, or invalid." },
        { status: 400 }
      );
    }

    // Extract search parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const roleName = searchParams.get("roleName");
    const orgName = searchParams.get("orgName");
    const isActive = searchParams.get("isActive");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Call the function to get filtered users data from the database
    const result = await getFilteredUsers(loggedInUserId,roleName, orgName, isActive, fromDate, toDate);

    const { output = {}, recordsets = [] } = result;

    // Ensure the response contains all the necessary data
    const usersData = recordsets[0] || [];
    const rolesList = recordsets[1]?.map((r) => r.user_role) || [];
    const orgList = recordsets[2]?.map((o) => o.org_name) || [];

    // Return success response with the filtered data
    return NextResponse.json(
      {
        message: output.outputmsg || "Success",
        data: {
          users: usersData,
          roles: rolesList,
          organizations: orgList,
        },
      },
      { status: output.statuscode || 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

// Function to fetch filtered users based on provided parameters
async function getFilteredUsers(currentUserId,roleName, orgName, isActive, fromDate, toDate) {
  const inputParams = {
    roleName: roleName || null,
    orgName: orgName || null,
    isActive: isActive ? parseInt(isActive, 10) : null,
    fromDate: fromDate ? new Date(fromDate) : null,
    toDate: toDate ? new Date(toDate) : null,
    currentUserId
  };

  try {
    const result = await executeStoredProcedure(
      "usp_GetFilteredUsers",
      inputParams,
      outputmsgWithStatusCodeParams
    );
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw new Error("Failed to retrieve filtered users from the database.");
  }
}
