// app/api/profileDisplay/route.js
// app/api/profileDisplay/route.js
import { NextResponse } from "next/server";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { message: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    const profileResult = await executeStoredProcedure("usp_ProfileDisplay", {
      UserId: userId,
    });

    if (!profileResult.recordset || profileResult.recordset.length === 0) {
      return NextResponse.json(
        { message: "Profile not found or inactive" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Profile fetched successfully",
        data: profileResult.recordset[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in profileDisplay API:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
