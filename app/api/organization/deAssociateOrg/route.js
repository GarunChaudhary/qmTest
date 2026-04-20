import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const body = await request.json();
    const { OrgId, UserIds, CreatedBy } = body;

    // Step 1: Auth token check
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Token missing",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.split(" ")[1];
    if (token !== API_SECRET_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Invalid token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Step 2: Privilege check (organization mapping)
    // const hasPrivilege = await checkUserPrivilege(
    //   CreatedBy,
    //   MODULES.USER_MANAGEMENT,
    //   PRIVILEGES.CREATE
    // );

    const hasPrivilege = await checkUserPrivilege(
      CreatedBy,
      MODULES.USER_MANAGEMENT,
      PRIVILEGES.DEASSOCIATE_ORG,
    );

    if (!hasPrivilege) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized: You do not have permission to modify organization mapping.",
        },
        { status: 403 },
      );
    }

    // Step 3: Input validation
    const missingFields = [
      { name: "OrgId", value: OrgId },
      { name: "UserIds", value: UserIds },
      { name: "CreatedBy", value: CreatedBy },
    ].filter((f) => isInvalid(f.value));

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map((f) => f.name).join(", ");
      return NextResponse.json(
        {
          success: false,
          message: `Missing or invalid fields: ${fieldNames}`,
        },
        { status: 400 },
      );
    }

    // Step 4: Ensure UserIds is string
    const userIdStr = Array.isArray(UserIds) ? UserIds.join(",") : UserIds;

    // Step 5: Call stored procedure
    const spResult = await assignOrganizationToAgent({
      OrgId,
      UserIds: userIdStr,
      CreatedBy,
    });

    const statusCode = parseInt(spResult.output?.statuscode || 500);
    const message = spResult.output?.outputmsg || "Unknown error";
    if (statusCode === 200) {
      const userName = request.headers.get("userName");

      await logAudit({
        userId: CreatedBy,
        userName: userName,
        actionType: "DEASSOCIATE_ORG",
        description: `User de-associated users ${userIdStr} from organization ${OrgId}`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }
    return NextResponse.json(
      {
        success: statusCode === 200,
        message,
      },
      { status: statusCode },
    );
  } catch (error) {
    console.error("Org Mapping Failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error: " + error.message,
      },
      { status: 500 },
    );
  }
}

// 🔁 Procedure executor
async function assignOrganizationToAgent({ OrgId, UserIds, CreatedBy }) {
  const inputParams = {
    OrgId,
    UserIds,
    CreatedBy,
  };

  const result = await executeStoredProcedure(
    "usp_AssignOrganizationToAgent",
    inputParams,
    outputmsgWithStatusCodeParams,
  );

  return result;
}
