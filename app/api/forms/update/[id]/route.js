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
    const formIdToUpdate = parseInt(params.id);
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
    if (isInvalid(formIdToUpdate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Request body or parameter could not be read properly.",
        },
        { status: 400 }
      );
    }
    const { Status, currentUserId } = await request.json();
    // Update form by ID
    const result = await UpdateFormById(formIdToUpdate, Status, currentUserId);
    const { StatusCode, Message } = result.recordset[0]; // Assuming a single record is returned

    if (StatusCode === 200) {
      return NextResponse.json(
        { success: true, message: Message },
        { status: 200 }
      );
    } else if (StatusCode === 404) {
      return NextResponse.json(
        { success: false, message: Message },
        { status: 404 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: Message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Update request:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function UpdateFormById(id, Status, currentUserId) {
  const inputParams = {
    formIdToUpdate: id,
    Status,
    currentUserId,
  };

  const result = await executeStoredProcedure(
    "usp_UpdateFormStatus",
    inputParams,
    outputmsgWithStatusCodeParams
  );
  return result;
}
