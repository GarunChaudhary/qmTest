// lib/auditLogger.js

import { executeStoredProcedure } from "@/lib/mssqldb";

export async function logAudit({
  userId,
  userName,
  actionType,
  interactionId = null,
  description = null,
  ipAddress = null,
}) {
  try {
    if (!userId) return;

    await executeStoredProcedure(
      "usp_InsertAuditTrail",
      {
        userId: parseInt(userId),
        userName: userName || "unknown",
        actionType,
        interactionId,
        description,
        ipAddress: ipAddress || "unknown",
      },
      {},
    );
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
