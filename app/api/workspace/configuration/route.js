import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getConfigurationData();

    if (result.recordset && result.recordset.length > 0) {
      // Get column names dynamically
      const columns = Object.keys(result.recordset[0]);

      return NextResponse.json(
        {
          message:
            result.output?.outputmsg ||
            "Configuration data fetched successfully.",
          columns: columns, // dynamic column names
          rows: result.recordset, // grid data
        },
        { status: result.output?.statuscode || 200 },
      );
    } else {
      return NextResponse.json(
        {
          message: "No configuration data found.",
          columns: [],
          rows: [],
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error in GetConfiguration API:", error);

    return NextResponse.json(
      {
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

async function getConfigurationData() {
  const result = await executeStoredProcedure("usp_getconfiguration");
  return result;
}
