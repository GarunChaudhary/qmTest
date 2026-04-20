// app/api/agentorganization/delete/[id]/route.js

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
    // const { agentId } = params;
    const { id } = params; // <- 'id' not 'agentId'
    const { currentUserId } = await request.json();

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

    if (isInvalid(id) || isInvalid(currentUserId)) {
      return NextResponse.json(
        { message: "Missing or invalid input parameters." },
        { status: 400 }
      );
    }

    const result = await deleteAgentOrgMapping(id, currentUserId);

    if (!result || !result.output) {
      return NextResponse.json(
        { message: "No response from stored procedure." },
        { status: 500 }
      );
    }

    const { outputmsg, statuscode } = result.output;

    return NextResponse.json({ message: outputmsg }, { status: statuscode });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function deleteAgentOrgMapping(id, deletedBy) {
  const inputParams = {
    agentId: id, // <-- must be 'agentId' to match SP parameter
    deletedBy,
  };

  const result = await executeStoredProcedure(
    "usp_DeleteOrgAgentMapping",
    inputParams,
    outputmsgWithStatusCodeParams
  );

  if (!result || !result.output) {
    throw new Error("Stored procedure did not return output.");
  }

  return result;
}
