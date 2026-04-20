// app/api/interactions/[id]/route.js

import { isInvalid } from "@/lib/generic";
import { NextResponse } from "next/server";
import { setInteractions } from "@/lib/models/interaction";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { logAudit } from "@/lib/auditLogger";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const interactionId = params.id;
    const loggedInUserId = request.headers.get("loggedInUserId");
    const userName = request.headers.get("userName");
    const timezone = request.headers.get("timezone");
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
    if (isInvalid(loggedInUserId) || isInvalid(interactionId)) {
      return NextResponse.json(
        { message: "Headers or Parameter are missing or undefined or empty." },
        { status: 400 },
      );
    }
    const hasViewPermission = await checkUserPrivilege(
      loggedInUserId,
      MODULES.INTERACTION,
      PRIVILEGES.VIEW,
    );

    if (!hasViewPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: No permission to view interaction.",
        },
        { status: 403 },
      );
    }
    const result = await getInteractionById(
      interactionId,
      loggedInUserId,
      timezone,
    );
    if (result.recordsets.length > 0 && result.recordset) {
      // ✅ Audit Log - View Interaction
      const interactions = await setInteractions(result.recordsets[0]);
      const callId = interactions?.[0]?.callId || interactionId;

      await logAudit({
        userId: loggedInUserId,
        userName: userName,
        actionType: "VIEW_INTERACTION",
        interactionId,
        description: `User viewed interaction ${callId}`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });

      return NextResponse.json(
        {
          message: result.output.outputmsg,
          interactions,
        },
        { status: result.output.statuscode },
      );
    } else {
      return NextResponse.json(
        { message: result.output.outputmsg },
        { status: result.output.statuscode },
      );
    }
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getInteractionById(id, loggedInUserId, timezone) {
  const inputParams = {
    interactionId: id,
    userId: loggedInUserId,
    timezone,
  };

  const result = await executeStoredProcedure(
    "usp_GetInteractionById",
    inputParams,
    outputmsgWithStatusCodeParams,
  );
  return result;
}
