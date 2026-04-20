import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export async function POST(req) {
  try {
    const body = await req.json();
    const { workspaceId, mappings, created_by } = body;

    const result = await executeStoredProcedure("usp_SaveColumnMapping", {
      workspaceid: workspaceId,
      mappingJson: JSON.stringify(mappings),
      created_by,
    });

    return NextResponse.json({
      message: "Column mapping saved successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to save mapping" },
      { status: 500 },
    );
  }
}
