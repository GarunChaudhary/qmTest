import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const userId = params.id;
    const { oldPassword, newPassword, currentUserId } = await request.json();

    // 🔐 Token checks
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Token missing" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (token !== API_SECRET_TOKEN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    // 🧪 Input validation
    if (
      isInvalid(oldPassword) ||
      isInvalid(newPassword) ||
      isInvalid(currentUserId)
    ) {
      return NextResponse.json(
        { message: "Request body or parameter could not be read properly." },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        {
          message:
            "New password can't be the same as old password, please choose a different password.",
        },
        { status: 403 }
      );
    }

    if (userId != currentUserId) {
      return NextResponse.json(
        {
          message:
            "You do not have access to reset the password of another user.",
        },
        { status: 403 }
      );
    }

    // ✅ Send plain text old/new password — let SQL hash & check
    const updateResult = await resetPassword(
      userId,
      oldPassword,
      newPassword,
      currentUserId
    );

    return NextResponse.json(
      { message: updateResult.output.outputmsg },
      { status: updateResult.output.statuscode }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function resetPassword(id, oldPass, newPass, updateBy) {
  const inputParams = {
    userId: id,
    oldPassword: oldPass,
    newPassword: newPass,
    updatedBy: updateBy,
  };

  const result = await executeStoredProcedure(
    "usp_ResetPassword",
    inputParams,
    outputmsgWithStatusCodeParams
  );
  return result;
}

async function getHashPasswordById(userId) {
  const inputParams = {
    userId: userId,
  };
  const result = await executeStoredProcedure(
    "usp_GetHashPasswordById",
    inputParams,
    outputmsgWithStatusCodeParams
  );
  return result;
}
