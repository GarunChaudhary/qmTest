import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const organizationId = parseInt(params.id);

    if (isInvalid(organizationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or missing organization ID.",
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const result = await deleteOrganizationById(organizationId);

    const { StatusCode, Message } = result.recordset[0];

    return NextResponse.json(
      {
        success: StatusCode === 200,
        message: Message,
        statusCode: StatusCode, // ✅ ADD THIS
      },
      { status: 200 } // Always respond with 200 for frontend to parse
    );
  } catch (error) {
    console.error("Error in Delete Organization API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

async function deleteOrganizationById(id) {
  const inputParams = {
    OrganizationId: id,
  };

  // Call stored procedure
  const result = await executeStoredProcedure(
    "usp_DeleteOrganization",
    inputParams,
    outputmsgWithStatusCodeParams
  );

  return result;
}
