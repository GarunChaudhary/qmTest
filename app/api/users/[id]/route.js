import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const userUniqueId = params.id;
    const currentUserId = request.headers.get("loggedInUserId");

    // 🔐 Step 2: Check if token is missing or incorrect
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Token missing",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
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
        }
      );
    }
    if (isInvalid(userUniqueId) || isInvalid(currentUserId)) {
      return NextResponse.json(
        {
          message: "Request headers or parameter could not be read properly.",
        },
        { status: 400 }
      );
    }

    // Fetch user record from database
    const userDetails = await getUserDetailsById(userUniqueId, currentUserId);

    if (!userDetails.recordset.length) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userRecord = userDetails.recordset[0];

    // Map the results into the desired format
    const user = {
      userId: userRecord.userId,
      loginId: userRecord.loginId,
      email: userRecord.email,
      userFullName: userRecord.userFullName,
      phone: userRecord.phone,
      userAddress: userRecord.userAddress,
      activeStatus: userRecord.activeStatus,
      isActive: userRecord.isActive,
      userUniqueId: userRecord.userUniqueId,
      roles: userRecord.roleId
        ? userRecord.roleId.split(",").map((roleId, index) => ({
            roleId: parseInt(roleId, 10),
            roleName: userRecord.roleName.split(",")[index],
          }))
        : [],
      organizations: userRecord.orgIds
        ? userRecord.orgIds.split(",").map((orgId, index) => ({
            orgId: parseInt(orgId, 10),
            orgName: userRecord.orgNames.split(",")[index],
          }))
        : [], // Support for multiple organizations
    };

    return NextResponse.json(
      { message: "Record found", user },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getUserDetailsById(userUniqueId, currentUserId) {
  const inputParams = {
    userUniqueId: userUniqueId,
    currentUserId: currentUserId,
  };

  const result = await executeStoredProcedure(
    "usp_GetUsersDetailsById",
    inputParams
  );

  return result;
}
