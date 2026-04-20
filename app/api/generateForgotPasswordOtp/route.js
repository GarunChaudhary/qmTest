// app/api/generateForgotPasswordOtp/route.js
import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    const { emailOrUsername } = await request.json();

    if (isInvalid(emailOrUsername)) {
      return NextResponse.json(
        { success: false, message: "Email or Login ID is required" },
        { status: 200 }
      );
    }

    // Call the stored procedure to generate OTP
    const result = await executeStoredProcedure(
      "usp_GenerateForgotPasswordOtp",
      { userEmail: emailOrUsername }
    );

    const [spResponse] = result.recordset || [];

    if (!spResponse) {
      return NextResponse.json(
        { success: false, message: "Unexpected error occurred." },
        { status: 500 }
      );
    }

    if (spResponse.success !== 1) {
      // OTP generation failed (e.g. user not found)
      return NextResponse.json(
        {
          success: false,
          message: spResponse.message || "Failed to generate OTP",
        },
        { status: 200 }
      );
    }

    const otp = spResponse.otp; // OTP from SP
    const toEmail = emailOrUsername; // Assuming emailOrUsername is the email

    // Setup Nodemailer transporter (reuse your SMTP config)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
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
    // const endpoint = process.env.REACT_APP_ENDPOINT;
    // Construct the verification URL with query params
    const verificationUrl = `${baseUrl}/OTP?email=${encodeURIComponent(
      toEmail
    )}`;
    console.log("verificationUrl is: ", verificationUrl);

    // Email content with OTP and verification link
    const mailOptions = {
      from: `"Verify QM" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: "Your Password Reset OTP",
      html: `
        <p>Hi,</p>
        <p>You requested to reset your password.</p>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>Click here to verify your OTP:</p>
        <p>👉 <a href="${verificationUrl}">Verify your OTP</a></p>
        <p>This link will expire after 10 minutes. If you did not request this, please ignore this email.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${toEmail}`);
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr);
      // Optionally, you can handle this differently if needed
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP generated and sent to your email.",
        // otp, // <-- remove this in production
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Generate OTP error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error: " + err.message,
      },
      { status: 500 }
    );
  }
}
