// app/api/users/add/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { logAudit } from "@/lib/auditLogger";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
import { isSuperAdminFromRequest, SUPER_ADMIN_ROLE_ID } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    const body = await request.json();

    const {
      loginId,
      email,
      userFullName,
      phone,
      userAddress,
      rolesIds,
      orgIds,
      currentUserId,
      currentUserName,
    } = body;

    // 🔐 Step 1: Validate Authorization
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
      MODULES.USER_MANAGEMENT,
      PRIVILEGES.CREATE,
    );

    if (!hasAddPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: You do not have permission to add users.",
        },
        { status: 403 },
      );
    }

    const isSuperAdmin = await isSuperAdminFromRequest();
    const hasSuperAdminRole = Array.isArray(rolesIds)
      ? rolesIds.some((r) => Number(r?.roleId) === SUPER_ADMIN_ROLE_ID)
      : false;

    if (hasSuperAdminRole && !isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to assign Super Admin role.",
        },
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
          {
            success: false,
            message: "Super Admin must belong to root organization only.",
          },
          { status: 400 },
        );
      }
    }

    // 📋 Step 3: Field Validation
    const missingFields = [
      { name: "loginId", value: loginId },
      // { name: "email", value: email },  // Email is optional
      { name: "userFullName", value: userFullName },
      // { name: "phone", value: phone },
      // { name: "userAddress", value: userAddress },
      { name: "rolesIds", value: rolesIds },
      { name: "orgIds", value: orgIds },
      { name: "currentUserId", value: currentUserId },
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

    const rolesIdsJson = JSON.stringify(rolesIds);
    const orgIdsJson = JSON.stringify(
      orgIds.map((org) => ({ orgId: org.orgId })),
    );

    const spResult = await insertUserDetails({
      loginId,
      email,
      userFullName,
      phone,
      userAddress,
      rolesIds: rolesIdsJson,
      orgIds: orgIdsJson,
      currentUserId,
    });

    const statusCode = parseInt(spResult.output?.statuscode || 500);
    const message = spResult.output?.outputmsg || "Unknown error occurred.";

    const otpMatch = /OTP: *(\d{6})/.exec(message);
    const otp = otpMatch ? otpMatch[1] : null;

    let finalMessage = message;

    if (
      statusCode === 200 &&
      otp &&
      message.startsWith("User created successfully") &&
      email
    ) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: false,
          requireTLS: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        const baseUrl = process.env.REACT_APP_BASE_URL;
        const verificationUrl = `${baseUrl}/OTP?email=${encodeURIComponent(
          email,
        )}`;

        const mailOptions = {
          from: `"Verify QM" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Verify your account and set your password",
          html: `
    <p>Hi ${userFullName},</p>
    <p>Your account has been created successfully.</p>
    <p>Your LoginId is: ${loginId}</p>
    <p>Your OTP is: <strong>${otp}</strong></p>
    <p>Click here to verify your OTP:</p>
    <p>👉 <a href="${verificationUrl}">Verify your OTP</a></p>
    <p>This link will expire in 10 minutes. Please verify as soon as possible.</p>
  `,
        };

        await transporter.sendMail(mailOptions);

        finalMessage = `User created successfully. Verification email sent to ${email}.`;
      } catch (mailError) {
        console.error("Failed to send email:", mailError);
        finalMessage = `${message} However, sending the credentials email failed. Please inform the user manually.`;
      }
    }

    const isSuccess =
      statusCode === 200 && message.startsWith("User created successfully");
    // ⭐ AUDIT: USER CREATED
    if (isSuccess) {
      await logAudit({
        userId: currentUserId,
        userName: currentUserName,
        actionType: "USER_ADDED",
        description: `${currentUserName} added ${userFullName} (${loginId})`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }

    return NextResponse.json(
      {
        success: isSuccess,
        message: finalMessage,
      },
      { status: statusCode },
    );
  } catch (error) {
    console.error("Unexpected server error during user creation:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error: " + error.message,
      },
      { status: 500 },
    );
  }
}

async function insertUserDetails({
  loginId,
  email,
  userFullName,
  phone,
  userAddress,
  rolesIds,
  orgIds,
  currentUserId,
}) {
  const result = await executeStoredProcedure(
    "usp_InsertUser",
    {
      userLoginId: loginId,
      email,
      userFullName,
      phone,
      address: userAddress,
      rolesIds,
      orgIds,
      creationBy: currentUserId,
    },
    outputmsgWithStatusCodeParams,
  );

  return result;
}
