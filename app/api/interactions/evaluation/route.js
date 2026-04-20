import { NextResponse } from "next/server";
import {
  executeStoredProcedure,
  outputmsgWithStatusCodeParams,
} from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const {
      UniqueId,
      //id,
      formId,
      interactionId,
      spentTime,
      jsonData,
      currentUserId,
      scoringMethod,
      totalScore,
    } = await request.json();

    // Check if any of the required fields are undefined
    if (
      isInvalid(UniqueId) ||
      //isInvalid(id) ||
      isInvalid(formId) ||
      isInvalid(interactionId) ||
      isInvalid(spentTime) ||
      isInvalid(jsonData) ||
      isInvalid(currentUserId) ||
      isInvalid(scoringMethod) ||
      isInvalid(totalScore)
    ) {
      return NextResponse.json(
        { message: "Request body could not be read properly." },
        { status: 400 }
      );
    }

    const result = await submitEvulationForm(
      UniqueId,
      //id,
      interactionId,
      formId,
      spentTime,
      jsonData,
      currentUserId,
      scoringMethod,
      totalScore
    );

    return NextResponse.json(
      { message: result.output.outputmsg },
      { status: result.output.statuscode }
    );
  } catch (error) {
    if (error instanceof RangeError)
      return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function submitEvulationForm(
  UniqueId,
  //Id,
  IdnteractionId,
  FormId,
  SpentTime,
  JsonData,
  currentUserId,
  scoringMethod,
  totalScore
) {
  const inputParams = {
    UniqueId: UniqueId,
    //id: Id,
    interactionId: IdnteractionId,
    formId: FormId,
    spentTime: SpentTime,
    ansJson: JSON.stringify(JsonData), // Stringify JSON data
    evaluationBy: currentUserId,
    scoringMethod: scoringMethod,
    totalScore: totalScore,
  };

  const result = await executeStoredProcedure(
    "usp_SubmitEvaluationForm",
    inputParams,
    outputmsgWithStatusCodeParams
  );

  return result;
}
