import { executeStoredProcedure } from "@/lib/mssqldb";
import { isSuperAdminFromRequest } from "@/lib/auth/superAdmin";

export async function checkUserPrivilege(userId, moduleId, privilegeId) {
  try {
    if (await isSuperAdminFromRequest()) {
      return true;
    }
    const result = await executeStoredProcedure("usp_GetPrivileges", {
      UserId: userId,
    });

    const userPrivileges = result.recordset;

    const hasPermission = userPrivileges.some(
      (priv) => priv.ModuleId === moduleId && priv.PrivilegeId === privilegeId
    );

    return hasPermission;
  } catch (error) {
    console.error("Error checking privilege:", error.message);
    return false;
  }
}
