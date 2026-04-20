// app/api/users/resend-otp/route.js

// app/api/users/resend-otp/route.js
import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import nodemailer from "nodemailer";

export async function POST(req) {
  const authHeader = req.headers.get("authorization");

  const token = authHeader?.split(" ")[1];

  if (!token || token !== process.env.NEXT_PUBLIC_API_TOKEN) {
    console.warn("[resend-otp] Unauthorized request");
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[resend-otp] Failed to parse JSON:", err);
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = body.email;

  if (!email) {
    console.warn("[resend-otp] Missing email in request body");
    return NextResponse.json(
      { success: false, message: "Email is required." },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await executeStoredProcedure("usp_GenerateNewOtp", { email });
  } catch (err) {
    console.error("[resend-otp] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Database error: " + err.message },
      { status: 500 }
    );
  }

  const otp = result.recordset?.[0]?.otp;

  if (!otp) {
    console.error("[resend-otp] SP did not return OTP");
    return NextResponse.json(
      { success: false, message: "Failed to generate new OTP." },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  const baseUrl = process.env.REACT_APP_BASE_URL;
  const verificationUrl = `${baseUrl}/OTP?email=${encodeURIComponent(email)}`;
  console.log("verificationUrl is: ", verificationUrl);
  const mailOptions = {
    from: `"Verify QM" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your new OTP",
    html: `
    <p>Hi,</p>
    <p>You requested a new OTP.</p>
    <p>Your new OTP code is: <strong>${otp}</strong></p>
    <p>Click here to verify your OTP:</p>
    <p>👉 <a href="${verificationUrl}">Verify your OTP</a></p>
    <p>This link will expire after 10 minutes. If you did not request this, please ignore this email.</p>
  `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("[resend-otp] Failed to send email:", err);
    return NextResponse.json(
      { success: false, message: "Failed to send OTP email." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `New OTP sent to ${email}.`,
  });
}
