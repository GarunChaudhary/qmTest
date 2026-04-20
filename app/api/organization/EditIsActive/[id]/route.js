import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { userId, OrganizationId, isActive } = await request.json();

    if (!userId || !OrganizationId || isActive === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Required fields missing.",
        },
        { status: 400 }
      );
    }

    const result = await executeStoredProcedure(
      "usp_EditActiveInactiveOrganization",
      {
        userId,
        OrganizationId,
        isActive,
      },
      outputmsgWithStatusCodeParams
    );

    if (parseInt(result.output.statuscode) === 200) {
      return NextResponse.json(
        { success: true, message: result.output.outputmsg },
        { status: 200 }
      );
    } else {
      return NextResponse.json({
        success: false,
        message: result.output.outputmsg,
      });
    }
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error.",
    });
  }
}
