// app/api/interactions/searchHistory/route.js

import { executeStoredProcedure } from "@/lib/mssqldb";

export async function GET(request) {
  const userId = request.headers.get("loggedInUserId");
  const timezone = request.headers.get("timezone");

  const result = await executeStoredProcedure("usp_GetUserSearchHistory", {
    UserId: userId,
    timezone: timezone,
  });

  return Response.json({
    history: result.recordset.map((r) => ({
      id: r.SearchId,
      createdAt: r.CreatedAt
        ? new Date(r.CreatedAt).toISOString().replace("T", " ").substring(0, 19)
        : null,
      payload: JSON.parse(r.SearchPayload),
    })),
  });
}
