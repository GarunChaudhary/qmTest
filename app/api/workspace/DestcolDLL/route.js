import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

// Main API Handler
export async function GET() {
  try {
    const destFields = await getAllDestinationFieldsDDL();

    // Validate and process the result
    if (destFields.recordset && destFields.recordset.length > 0) {
      return NextResponse.json(
        {
          message:
            destFields.output.outputmsg || "Dropdown returned successfully.",
          destFieldList: destFields.recordset,
        },
        { status: destFields.output.statuscode || 200 },
      );
    } else {
      console.warn("No Destination Fields found.");
      return NextResponse.json(
        { message: "No Destination fields found.", destFieldList: [] },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error in CustomFields API:", error);
    return NextResponse.json(
      { message: "Internal server error.", error: error.message },
      { status: 500 },
    );
  }
}

// Helper function to execute the stored procedure
async function getAllDestinationFieldsDDL() {
  const result = await executeStoredProcedure("usp_DestinationfieldsDDL");
  return result;
}
