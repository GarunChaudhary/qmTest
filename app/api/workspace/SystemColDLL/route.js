import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await executeStoredProcedure("usp_SystemColDDL");

    const fixedColumns = result.recordsets?.[0] || [];
    const dynamicColumns = result.recordsets?.[1] || [];

    return NextResponse.json(
      {
        message: result.output?.outputmsg || "Dropdown returned successfully.",
        fixedColumns: fixedColumns,
        customFieldList: dynamicColumns,
      },
      { status: result.output?.statuscode || 200 },
    );
  } catch (error) {
    console.error("Error in CustomFields API:", error);

    return NextResponse.json(
      {
        message: "Internal server error.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
