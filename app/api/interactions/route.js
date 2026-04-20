// app/api/interactions/route.js
import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  TotalRecords,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { setInteractions } from "@/lib/models/interaction";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    const body = await request.json();

    const {
      pageNo = 1,
      rowCountPerPage = 10,
      search = null,
      fromDate = null,
      toDate = null,
      organizationIds = null,
      agentNameIds = null,
      extensions = null,
      callId = null,
      ucid = null,
      agent = null,
      formIds = null,
      evaluatorIds = null,
      // durationBucketIds = null,
      durationOperator = null,
      durationValue = null,
      durationValue2 = null, // ⭐ for between
      aniDni = null, // ⭐ NEW
      currentUserId,
      timezone = null,
      queryType = 0,
      ActiveStatus = 0,
      privilegeId = 0,
    } = body;

    // === Auth validation ===
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      console.warn("[Auth] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Token missing",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.split(" ")[1];

    if (token !== API_SECRET_TOKEN) {
      console.warn("[Auth] Invalid API token");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Invalid token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    if (isInvalid(currentUserId)) {
      console.error("[Validation] Invalid currentUserId:", currentUserId);
      return NextResponse.json(
        { message: "Request body could not be read properly." },
        { status: 400 },
      );
    }

    const hasViewPermission = await checkUserPrivilege(
      currentUserId,
      MODULES.INTERACTION,
      PRIVILEGES.VIEW,
    );

    if (!hasViewPermission) {
      console.warn("[Privilege] User lacks permission to view interactions.");
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: No permission to view interaction.",
        },
        { status: 403 },
      );
    }

    // === Serialize inputs ===
    const organizationIdsJSON = organizationIds
      ? JSON.stringify(organizationIds)
      : null;
    const agentNameIdsJSON = agentNameIds ? JSON.stringify(agentNameIds) : null;
    const formattedFormIds =
      Array.isArray(formIds) && formIds.length > 0 ? formIds.join(",") : null;
    const formattedEvaluatorIds =
      Array.isArray(evaluatorIds) && evaluatorIds.length > 0
        ? evaluatorIds.join(",")
        : null;
    // const formattedDurationBucketIds =
    //   Array.isArray(durationBucketIds) && durationBucketIds.length > 0
    //     ? durationBucketIds.join(",")
    //     : null;

    const result = await getInteractions(
      pageNo,
      rowCountPerPage,
      search,
      fromDate,
      toDate,
      organizationIdsJSON,
      agentNameIdsJSON,
      extensions,
      callId,
      ucid,
      agent,
      formattedFormIds,
      formattedEvaluatorIds,
      // formattedDurationBucketIds, // ⭐ NEW
      durationOperator,
      durationValue,
      durationValue2,
      aniDni, // ⭐ NEW
      currentUserId,
      timezone,
      queryType,
      ActiveStatus,
      privilegeId,
    );

    // === Handle SP Response ===
    if (result.recordsets.length > 0) {
      if (queryType === 0) {
        if (result.recordsets.length > 1) {
          const interactions = await setInteractions(result.recordsets[0]);
          const totalRecord = await TotalRecords(result.recordsets[1]);

          return NextResponse.json(
            {
              message: result.output.outputmsg,
              totalRecord,
              interactions,
            },
            { status: result.output.statuscode },
          );
        } else {
          console.warn("[Result] Only one recordset returned.");
          return NextResponse.json(
            { message: result.output.outputmsg },
            { status: result.output.statuscode },
          );
        }
      } else {
        const interactions = await setInteractions(result.recordsets[0]);

        return NextResponse.json(
          {
            message: result.output.outputmsg,
            interactions,
          },
          { status: result.output.statuscode },
        );
      }
    } else {
      console.warn("[Result] No recordsets returned from stored procedure.");
      return NextResponse.json(
        { message: result.output.outputmsg },
        { status: result.output.statuscode },
      );
    }
  } catch (error) {
    console.error("[Exception] Unhandled error in POST /interactions:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getInteractions(
  pageNo,
  rowCountPerPage,
  search,
  fromDate,
  toDate,
  organizationIds,
  agentNameIds,
  extensions,
  callId,
  ucid,
  agent,
  formIds,
  evaluatorIds,
  // durationBucketIds, // ⭐ NEW
  durationOperator,
  durationValue,
  durationValue2,
  aniDni, // ⭐ NEW
  loggedInUserId,
  timezone,
  queryType,
  ActiveStatus,
  privilegeId,
) {
  const inputParams = {
    pageNo,
    rowCountPerPage,
    search,
    fromDate,
    toDate,
    organizationIds,
    agentNameIds,
    extensions,
    callId,
    ucid,
    agent,
    formIds,
    evaluatorIds,
    // durationBucketIds, // ⭐ NEW
    durationOperator,
    durationValue,
    durationValue2,
    aniDni, // ⭐ NEW
    userId: loggedInUserId,
    timezone,
    querytype: queryType,
    ActiveStatus,
    privilegeId,
  };

  try {
    const result = await executeStoredProcedure(
      "usp_GetInteractions",
      inputParams,
      outputmsgWithStatusCodeParams,
    );

    return result;
  } catch (err) {
    console.error("[SP Error] Error executing stored procedure:", err);
    throw err;
  }
}
