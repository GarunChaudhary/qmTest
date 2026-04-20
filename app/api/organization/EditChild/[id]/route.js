import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

const smartCapitalize = (str) => {
  if (!str) return "";

  return str
    .split(" ")
    .map((word) => {
      if (word === word.toUpperCase()) {
        // It's fully capitalized (acronym or emphasized), leave as-is
        return word;
      }
      if (word.length === 0) return "";

      // Capitalize only the first letter, keep the rest lowercase
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export async function POST(request) {
  try {
    const { name, description, userId, OrganizationId } = await request.json();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Organization name required.",
        },
        { status: 400 }
      );
    }

    // Apply smartCapitalize only to name
    const capitalizedName = smartCapitalize(name);

    const result = await editOrganization({
      name: capitalizedName,
      description,
      userId,
      OrganizationId,
    });

    if (parseInt(result.output.statuscode) === 200) {
      return NextResponse.json(
        { success: true, message: result.output.outputmsg },
        { status: 200 }
      );
    } else {
      return NextResponse.json({
        success: false,
        message: result.output.outputmsg,
      });
    }
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error.",
    });
  }
}

async function editOrganization({ name, description, userId, OrganizationId }) {
  try {
    const inputParams = {
      Name: name,
      Description: description,
      userId: userId,
      OrganizationId: OrganizationId,
    };

    const result = await executeStoredProcedure(
      "usp_EditOrganization",
      inputParams,
      outputmsgWithStatusCodeParams
    );

    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw new Error("Failed to save organization.");
  }
}
