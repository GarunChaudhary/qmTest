import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { checkUserPrivilege } from "@/lib/auth/privilegeChecker";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export async function POST(request) {
  try {
    const {
      formName,
      formDescription,
      sections,
      hideFormScore,
      basePercentage,
      scoringMethod,
      baselineScore,
      visibilityRules,
      scoringRules,
      disabledOptions,
      Status,
      currentUserId,
      header,
      footer,
    } = await request.json();
    const authHeader = request.headers.get("authorization");

    // 🔐 Step 2: Check if token is missing or incorrect
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Token missing",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.split(" ")[1];

    if (token !== API_SECRET_TOKEN) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Invalid token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const hasAddPermission = await checkUserPrivilege(
      currentUserId,
      MODULES.FORM_DESIGNER, // → this will be 2
      PRIVILEGES.CREATEEDITFORM // → this will be 2
    );

    if (!hasAddPermission) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: You do not have permission to Save Form.",
        },
        { status: 403 }
      );
    }

    const isInvalid = (value) =>
      value === undefined || value === null || value === "";
    if (isInvalid(formName)) {
      return NextResponse.json(
        { success: false, message: "Form name is undefined or empty." },
        { status: 400 }
      );
    }

    if (isInvalid(sections)) {
      return NextResponse.json(
        { success: false, message: "Sections are undefined or empty." },
        { status: 400 }
      );
    }
    const formattedDisabledOptions = {
      first: Array.isArray(disabledOptions?.first) ? disabledOptions.first : [],
      second: Array.isArray(disabledOptions?.second)
        ? disabledOptions.second
        : [],
    };

    const formJson = JSON.stringify({
      sections,
      hideFormScore,
      basePercentage,
      scoringMethod,
      visibilityRules,
      scoringRules,
      disabledOptions: formattedDisabledOptions,
      header,
      footer,
    });

    // Try to create the form using the stored procedure
    const result = await CreateForm(
      formName,
      formDescription,
      formJson,
      Status,
      currentUserId,
      baselineScore
    );

    if (parseInt(result.output.statuscode) === 200) {
      return NextResponse.json(
        { success: true, message: result.output.outputmsg },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: result.output.outputmsg },
        { status: result.output.statuscode }
      );
    }
  } catch (error) {
    console.error("Internal server error:", error);
    if (error instanceof RangeError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function CreateForm(
  formName,
  formDescription,
  formJson,
  status,
  currentUserId,
  baselineScore
) {
  try {
    const inputParams = {
      formName,
      formDescription,
      formJson,
      status,
      currentUserId,
      baselineScore:
        baselineScore === "" || baselineScore === null ? 0.0 : baselineScore,
    };
    const result = await executeStoredProcedure(
      "usp_CreateNewForm",
      inputParams,
      outputmsgWithStatusCodeParams
    );
    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw new Error("Failed to create the form.");
  }
}
