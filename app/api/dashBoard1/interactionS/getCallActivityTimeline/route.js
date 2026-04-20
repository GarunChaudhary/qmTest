import { NextResponse } from "next/server";
import { isInvalid } from "@/lib/generic";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const loggedInUserId = parseInt(request.headers.get("loggedInUserId"), 10);
    const timezone = request.headers.get("timezone");

    if (isInvalid(loggedInUserId)) {
      return NextResponse.json(
        { message: "LoggedInUserId header is missing, undefined, or invalid." },
        { status: 400 }
      );
    }

    const { data, output } = await getCallActivityTimeline(
      loggedInUserId,
      timezone
    );

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "No call activity timeline found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: output.outputmsg || "Success",
        data: data,
      },
      { status: output.statuscode || 200 }
    );
  } catch (error) {
    console.error("API Error:", error.message);
    return NextResponse.json(
      { message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

async function getCallActivityTimeline(currentUserId, timezone) {
  const inputParams = {
    currentUserId: currentUserId,
    timezone,
  };

  try {
    const { recordset, output } = await executeStoredProcedure(
      "usp_GetCallActivityTimeline",
      inputParams,
      outputmsgWithStatusCodeParams
    );

    return { data: recordset, output };
  } catch (error) {
    console.error("Error executing usp_GetCallActivityTimeline:", error);
    throw new Error("Failed to retrieve call activity timeline.");
  }
}
