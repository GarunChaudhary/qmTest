export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { executeStoredProcedure, outputmsgParams } from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import jwt from "jsonwebtoken";
import { setUsersLoginModel } from "@/lib/models/userlogin";
import { isInvalid } from "@/lib/generic";
import CryptoJS from "crypto-js";

export async function POST(request) {
  try {
    const { payload } = await request.json();
    const secretKey =
      process.env.NEXT_PUBLIC_CLIENT_ENCRYPT_KEY || "mySecretKey123";

    // Decrypt the payload
    const bytes = CryptoJS.AES.decrypt(payload, secretKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    const { username, password } = decryptedData || {};
    const trimmedUsername = username.trim();

    if (isInvalid(trimmedUsername) || isInvalid(password)) {
      return NextResponse.json(
        { message: "LoginId or password cannot be empty." },
        { status: 400 },
      );
    }

    if (username !== trimmedUsername) {
      return NextResponse.json(
        { message: "Email or LoginId contains invalid spaces." },
        { status: 400 },
      );
    }

    // This now passes both username and password to the stored procedure
    const loginResult = await getUserLogin(trimmedUsername, password);
    // Return specific messages *before* checking recordsets
    const msg = loginResult?.output?.outputmsg;

    if (msg === "You have entered invalid credentials.") {
      return NextResponse.json({ message: msg }, { status: 401 });
    }
    if (
      msg ===
      "You are not authorized to login due to user not existing or being inactive in the system."
    ) {
      return NextResponse.json({ message: msg }, { status: 404 });
    }
    if (msg === "Your account does not exists.") {
      return NextResponse.json({ message: msg }, { status: 403 });
    }

    if (loginResult?.recordsets?.length > 0) {
      const userArray = await setUsersLoginModel(
        loginResult.recordset,
        loginResult.recordsets,
      );

      if (Array.isArray(userArray) && userArray.length > 0) {
        const user = userArray[0];
        const userId = user.userId;

        await logAudit({
          userId: user.userId,
          userName: user.userFullName,
          actionType: "LOGIN",
          description: "User logged into system",
          ipAddress: request.headers.get("x-forwarded-for"),
        });

        await expireOtherSessions(userId);
        const userLoginToken = await generateJWTToken(user);

        await createNewSession(userId, userLoginToken, request);

        const response = NextResponse.json({
          message: loginResult.output.outputmsg,
          user: {
            userId: user.userId,
            userFullName: user.userFullName,
            userRoles: user.userRoles,
            email: user.email,
            organization: user.organization,
          },
        });

        const isProduction = process.env.NODE_ENV === "production";
        const isHttps = request.url.startsWith("https");

        response.cookies.set("sessionToken", userLoginToken, {
          httpOnly: true,
          secure: isProduction && isHttps,
          path: "/",
          sameSite: "lex",
          maxAge: 60 * 60 * 60 * 1,
        });

        return response;
      }
    }

    // return NextResponse.json(
    //   { message: "Login failed due to unknown reasons." },
    //   { status: 500 }
    // );
    return NextResponse.json(
      {
        message:
          loginResult?.output?.outputmsg || "Login failed. Please try again.",
      },
      { status: 500 },
    );
  } catch (error) {
    console.error("Error during login process:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 },
    );
  }
}

async function createNewSession(userId, token, req) {
  try {
    const expiryTimestamp = new Date();
    expiryTimestamp.setDate(expiryTimestamp.getDate() + 2);

    const userAgent = req.headers.get("user-agent") || "unknown";
    //const ipAddress = req.headers.get("x-forwarded-for") || req.ip || "unknown";

    const inputParams = {
      userId,
      sessionToken: token,
      loginTimestamp: new Date().toISOString(),
      expiryTimestamp: expiryTimestamp.toISOString(),
      userAgent,
      //ipAddress,
    };

    await executeStoredProcedure("usp_CreateUserSession", inputParams, {});
  } catch (error) {
    console.error("Error creating new session:", error);
  }
}

async function expireOtherSessions(userId) {
  try {
    const currentTimestamp = new Date().toISOString();
    const inputParams = {
      userId,
      expiryTimestamp: currentTimestamp, // Expiry timestamp for expired sessions
    };

    await executeStoredProcedure("usp_ExpireUserSessions", inputParams, {});
  } catch (error) {
    console.error("Error expiring other sessions:", error);
  }
}

async function getHashPassword(usermailorname, password) {
  try {
    const inputParams = { username: usermailorname, password };
    const result = await executeStoredProcedure(
      "usp_UserLogin",
      inputParams,
      outputmsgParams,
    );
    return result;
  } catch (error) {
    console.error("Error getting hash password:", error);
  }
}

async function getUserLogin(username, password) {
  try {
    const inputParams = { username, password };
    const result = await executeStoredProcedure(
      "usp_UserLogin",
      inputParams,
      outputmsgParams,
    );
    return result;
  } catch (error) {
    console.error("Error getting user login:", error);
  }
}

async function generateJWTToken(userDetails) {
  try {
    const user = userDetails;
    const payload = {
      userId: user.userId,
      loginId: user.loginId,
      email: user.email,
      userFullName: user.userFullName,
      userRole: user.userRoles,
      phone: user.phone,
    };
    const secretkey = process.env.API_SECRET_KEY;
    const options = { expiresIn: "1d" };

    const token = jwt.sign(payload, secretkey, options);
    return token;
  } catch (error) {
    console.error("Error generating JWT Token:", error);
  }
}
