import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { setNavbarModuleModel } from "@/lib/models/navbar";
import { isInvalid } from "@/lib/generic";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = request.cookies.get("sessionToken")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized, no token found." }, { status: 401 });
    }

    let payload;
        try {
          const secretKey = new TextEncoder().encode(process.env.API_SECRET_KEY);
          const verified = await jwtVerify(token, secretKey);
          payload = verified.payload;
        } catch (err) {
          return NextResponse.json({ message: "Unauthorized, invalid token." }, { status: 401 });
        }
    // Headers (if necessary for authentication, etc.)
    const loggedInUserId = payload.userId;

    if (isInvalid(loggedInUserId)) {
      return NextResponse.json(
        { message: "Headers are missing or undefined or empty." },
        { status: 400 }
      );
    }

    // Fetch navbar modules from stored procedure
    const navbarModulesDetails = await getNavbarModulesDetails();

    if (navbarModulesDetails.recordsets.length > 0) {
      const navbarModules = await setNavbarModuleModel(navbarModulesDetails.recordsets[0]);

      return NextResponse.json(
        {
          message: navbarModulesDetails.output.outputmsg || "Success",
          navbarModules,
        },
        { status: navbarModulesDetails.output.statuscode || 200 }
      );
    }

    return NextResponse.json(
      { message: navbarModulesDetails.output.outputmsg || "No data found." },
      { status: navbarModulesDetails.output.statuscode || 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error || " + error.message },
      { status: 500 }
    );
  }
}

// Helper function to fetch navbar modules
async function getNavbarModulesDetails() {
  const result = await executeStoredProcedure(
    "usp_GetNavbarModules", // Stored Procedure name
    {}, // No input parameters for this stored procedure
    {}  
  );
  return result;
}
