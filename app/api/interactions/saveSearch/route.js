// app/api/interactions/saveSearch/route.js

import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";

export async function POST(req) {
  const body = await req.json();

  const { userId, payload } = body;

  const result = await executeStoredProcedure(
    "usp_SaveUserSearchHistory",
    {
      UserId: userId,
      SearchPayload: JSON.stringify(payload),
    },
    outputmsgWithStatusCodeParams, // ✅ FIX
  );

  return Response.json({
    message: result.output.outputmsg,
  });
}
