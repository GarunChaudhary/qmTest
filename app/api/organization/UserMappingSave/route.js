import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgParams,
} from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { organizationId, createdBy, users } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "OrganizationId is required." },
        { status: 400 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: "Users list is required." },
        { status: 400 }
      );
    }

    // 👇 JSON stringify
    const usersJson = JSON.stringify(users);

    const result = await executeStoredProcedure(
      "usp_insertbulkuserwithroleandorganization",
      {
        usersJson: usersJson,
        organization_id: organizationId,
        creation_by: createdBy,
      },
      outputmsgParams
    );

    return NextResponse.json(
      {
        success: true,
        message: result?.output?.outputmsg || "Users mapped successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}