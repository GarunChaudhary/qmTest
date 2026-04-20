import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { setUsersRolesModel } from "@/lib/models/userroles";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // Fetch roles from the database
    const roleDetails = await getUserRoles();
    if (roleDetails.recordset.length > 0) {
      const roles = await setUsersRolesModel(roleDetails.recordset);
      return NextResponse.json({ message: "Success", roles }, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "User roles not found." },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getUserRoles() {
  const result = await executeStoredProcedure("usp_GetUserRoles");
  return result;
}
