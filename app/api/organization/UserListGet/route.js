import { executeStoredProcedure } from "@/lib/mssqldb";

export async function GET() {

  try {
    const result = await executeStoredProcedure(
      "usp_GetCiscoUsersOrganizationUpdate"
    );

    const users = result.recordset;

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No Cisco users found with OrganizationUpdate = 0",
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
        message: "Cisco users fetched successfully",
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
    console.error("Error fetching Cisco users:", error);

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