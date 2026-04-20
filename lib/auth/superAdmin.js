import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const SUPER_ADMIN_ROLE_ID = 112;

export async function isSuperAdminFromRequest() {
  try {
    const token = cookies().get("sessionToken")?.value;
    if (!token) return false;
    const secretKey = new TextEncoder().encode(process.env.API_SECRET_KEY);
    const verified = await jwtVerify(token, secretKey);
    const roles = verified?.payload?.userRole || [];
    return Array.isArray(roles)
      ? roles.some((r) => Number(r?.roleId) === SUPER_ADMIN_ROLE_ID)
      : false;
  } catch {
    return false;
  }
}
