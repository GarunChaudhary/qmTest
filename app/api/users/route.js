// app/api/users/route.js
import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  TotalRecords,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { setUsersModel } from "@/lib/models/users";
import { isInvalid } from "@/lib/generic";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const loggedInUserId = request.headers.get("loggedInUserId");

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || 1);
    const perPage = parseInt(url.searchParams.get("perPage") || 10);
    const search = url.searchParams.get("search") || null;
    const queryType = parseInt(url.searchParams.get("queryType") || 0);
    const isActive = url.searchParams.get("isActive") || null;
    const roleFilter = (url.searchParams.get("roleFilter") || null)?.trim();
    const organizationFilter = (
      url.searchParams.get("organizationFilter") || null
    )?.trim();

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      console.warn("Missing or invalid authorization header");
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
      console.warn("Invalid API token");
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

    if (isInvalid(loggedInUserId)) {
      console.warn("Invalid logged-in user ID");
      return NextResponse.json(
        { message: "Logged-in user ID is missing or invalid." },
        { status: 400 },
      );
    }

    const hasViewPermission = await checkUserPrivilege(
      loggedInUserId,
      MODULES.USER_MANAGEMENT,
      PRIVILEGES.VIEW,
    );

    if (!hasViewPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: No permission to view users.",
        },
        { status: 403 },
      );
    }

    const userDetails = await getUserDetails(
      page,
      perPage,
      search,
      loggedInUserId,
      isActive,
      queryType,
      roleFilter,
      organizationFilter,
    );

    if (userDetails.recordsets.length > 0) {
      const users = await setUsersModel(userDetails.recordsets[0]);

      if (queryType === 0) {
        const totalRecord = await TotalRecords(userDetails.recordsets[1]);

        return NextResponse.json(
          {
            message: userDetails.output.outputmsg,
            totalRecord,
            users,
          },
          { status: userDetails.output.statuscode },
        );
      } else {
        return NextResponse.json(
          {
            message: userDetails.output.outputmsg,
            users,
          },
          { status: userDetails.output.statuscode },
        );
      }
    }

    return NextResponse.json(
      { message: userDetails.output.outputmsg },
      { status: userDetails.output.statuscode },
    );
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const {
      page = 1,
      perPage = 10,
      search,
      queryType = 0,
      currentUserId,
      isActive,
      roleFilter,
      organizationFilter,
    } = await request.json();

    if (isInvalid(currentUserId)) {
      console.warn("Invalid current user ID");
      return NextResponse.json(
        {
          message: "Current user ID is invalid or missing in the request body.",
        },
        { status: 400 },
      );
    }

    const userDetails = await getUserDetails(
      page,
      perPage,
      search,
      currentUserId,
      isActive,
      queryType,
      roleFilter,
      organizationFilter,
    );

    if (userDetails.recordsets.length > 0) {
      const users = await setUsersModel(userDetails.recordsets[0]);

      if (queryType === 0) {
        const totalRecord = await TotalRecords(userDetails.recordsets[1]);

        return NextResponse.json(
          {
            message: userDetails.output.outputmsg,
            totalRecord,
            users,
          },
          { status: userDetails.output.statuscode },
        );
      } else {
        return NextResponse.json(
          {
            message: userDetails.output.outputmsg,
            users,
          },
          { status: userDetails.output.statuscode },
        );
      }
    }

    return NextResponse.json(
      { message: userDetails.output.outputmsg },
      { status: userDetails.output.statuscode },
    );
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getUserDetails(
  pageNo,
  rowCountPerPage,
  search,
  currentUserId,
  isActive,
  queryType,
  roleFilter,
  organizationFilter,
) {
  const inputParams = {
    pageNo,
    rowCountPerPage,
    search,
    currentUserId,
    isActive,
    querytype: queryType,
    roleFilter,
    organizationIds: organizationFilter, // ✅ Match stored proc param
  };

  const result = await executeStoredProcedure(
    "usp_GetUsersDetails",
    inputParams,
    outputmsgWithStatusCodeParams,
  );

  return result;
}
