import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const userId = params.id;
    // Get request body
    const {
      loginId,
      email,
      userFullName,
      rolesIds, // Expecting an array like [{ "roleId": 1 }, { "roleId": 2 }]
      phone,
      userAddress,
      isActive,
      orgIds, // Array of organization IDs (similar to rolesIds)
      currentUserId,
      currentUserName,
    } = await request.json();

    if (
      isInvalid(userId) ||
      isInvalid(currentUserId) ||
      isInvalid(loginId) ||
      // isInvalid(email) ||
      isInvalid(userFullName) ||
      // isInvalid(phone) ||
      // isInvalid(userAddress) ||
      isInvalid(isActive) ||
      isInvalid(orgIds) || // Ensure orgIds is also validated
      !Array.isArray(orgIds) // Ensure orgIds is an array
    ) {
      console.error("Invalid request body or missing parameters.");
      return NextResponse.json(
        { message: "Invalid request body or missing parameters." },
        { status: 400 },
      );
    }
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
    const hasAddPermission = await checkUserPrivilege(
      currentUserId,
      MODULES.USER_MANAGEMENT, // → this will be 2
      PRIVILEGES.EDIT, // → this will be 2
    );

    if (!hasAddPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: You do not have permission to Update users.",
        },
        { status: 403 },
      );
    }

    const isSuperAdmin = await isSuperAdminFromRequest();

    // ✅ Fetch existing user details to prevent loginId change for Agent
    const existingUserResult = await executeStoredProcedure(
      "usp_GetSingleUser",
      { userId },
      {},
    );

    const records = existingUserResult?.recordset;

    if (!records || records.length === 0) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const existingLoginId = records[0].loginId;

    const roles = records.map((r) => ({
      roleId: r.roleId,
      roleName: r.roleName,
    }));

    const targetIsSuperAdmin = roles.some(
      (role) => Number(role.roleId) === SUPER_ADMIN_ROLE_ID
    );
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: "You are not allowed to edit Super Admin user." },
        { status: 403 },
      );
    }

    // const hasAgentRole = roles.some(
    //   (role) => role.roleName?.toLowerCase() === "agent"
    // );

    // if (hasAgentRole && loginId !== existingLoginId) {
    //   return NextResponse.json(
    //     { message: "You are not allowed to update Agent loginId." },
    //     { status: 403 }
    //   );
    // }
    // Step 1: Find out if user was previously an agent
    // const hadAgentRole = roles.some(
    //   (role) => role.roleName?.toLowerCase() === "agent",
    // );

    // Step 2: Check if Agent is being assigned again (i.e. still exists in new roles)
    const isAgentInNewRoles = (rolesIds || []).some(
      (role) =>
        role.roleId &&
        typeof role.roleId === "number" &&
        role.roleId === 4 /* your Agent Role ID */,
    );

    const hasSuperAdminRole = (rolesIds || []).some(
      (role) => Number(role?.roleId) === SUPER_ADMIN_ROLE_ID
    );
    if (hasSuperAdminRole && !isSuperAdmin) {
      return NextResponse.json(
        { message: "You are not allowed to assign Super Admin role." },
        { status: 403 },
      );
    }

    if (hasSuperAdminRole) {
      const onlyRootOrg =
        Array.isArray(orgIds) &&
        orgIds.length === 1 &&
        Number(orgIds[0]?.orgId) === 1;
      if (!onlyRootOrg) {
        return NextResponse.json(
          { message: "Super Admin must belong to root organization only." },
          { status: 400 },
        );
      }
    }

    // Step 3: Final condition
    // if (hadAgentRole && isAgentInNewRoles && loginId !== existingLoginId) {
    //   return NextResponse.json(
    //     { message: "You are not allowed to update Agent loginId." },
    //     { status: 200 }
    //   );
    // }
    if (loginId !== existingLoginId) {
      return NextResponse.json(
        {
          message:
            "You are not allowed to update user loginId. Please refresh the page",
        },
        { status: 200 },
      );
    }

    // Convert rolesIds to JSON string (default to empty array if not provided)
    const rolesIdsJson = rolesIds
      ? JSON.stringify(rolesIds.map(({ roleId }) => ({ roleId })))
      : "[]";

    // Convert orgIds to JSON string (default to empty array if not provided)
    const orgIdsJson = orgIds
      ? JSON.stringify(orgIds.map(({ orgId }) => ({ orgId })))
      : "[]"; // Default to empty array if orgIds is not provided

    // Call the stored procedure to update user details
    const result = await updateUserDetails(
      userId,
      loginId,
      email,
      userFullName,
      rolesIdsJson,
      phone,
      userAddress,
      isActive,
      orgIdsJson, // Pass multiple org IDs as JSON string
      currentUserId,
    );

    if (parseInt(result.output.statuscode) === 200) {
      await logAudit({
        userId: currentUserId,
        userName: currentUserName,
        actionType: "USER_UPDATED",
        description: `${currentUserName} updated ${userFullName} (${loginId})`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
      return NextResponse.json(
        { success: true, message: result.output.outputmsg },
        { status: 200 },
      );
    } else {
      return NextResponse.json({
        success: false,
        message: result.output.outputmsg,
      });
    }
  } catch (error) {
    console.error("Internal Server Error:", error.message, error.stack);
    return NextResponse.json(
      { message: `Internal Server Error: ${error.message}` },
      { status: 500 },
    );
  }
}

async function updateUserDetails(
  userId,
  loginId,
  email,
  userFullName,
  rolesIdsJson,
  phone,
  userAddress,
  isActive,
  orgIdsJson, // JSON string for multiple organization IDs
  currentUserId,
) {
  const inputParams = {
    userId,
    userLoginId: loginId,
    Email: email,
    userFullName,
    Phone: phone,
    Address: userAddress,
    isActive,
    orgIds: orgIdsJson, // Pass JSON string for multiple organizations
    rolesIds: rolesIdsJson, // JSON string for roles
    updatedBy: currentUserId,
  };

  // Execute the stored procedure
  const result = await executeStoredProcedure(
    "usp_UpdateUser",
    inputParams,
    outputmsgWithStatusCodeParams,
  );

  return result;
}
