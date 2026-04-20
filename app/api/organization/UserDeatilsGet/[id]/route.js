import { executeStoredProcedure } from "@/lib/mssqldb";

export async function GET(req, { params }) {

  const { id } = params;

  if (!id) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Organization ID is required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const result = await executeStoredProcedure(
      "usp_GetUsersByOrganizationforuserprofileview",
      {
        OrganizationId: id,
      }
    );

    const users = result.recordset;

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No users found for this organization",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Users fetched successfully",
        users,
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
  } catch (error) {
    console.error("Error fetching users by organization:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}