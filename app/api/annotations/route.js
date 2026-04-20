import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";
const API_SECRET_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

function authError() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
}

// Strip to digits only — safe numeric string for bigint columns
function toIntStr(val) {
  const s = String(val ?? "").trim().replace(/[^0-9]/g, "");
  return s || "0";
}

/* ── GET /api/annotations?interactionId=xxx&userId=xxx ── */
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader.split(" ")[1] !== API_SECRET_TOKEN) return authError();

  const { searchParams } = new URL(request.url);
  const interactionId = toIntStr(searchParams.get("interactionId"));
  const userId        = toIntStr(searchParams.get("userId"));

  if (!interactionId || interactionId === "0")
    return NextResponse.json({ success: false, message: "interactionId required" }, { status: 400 });
  if (!userId || userId === "0")
    return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });

  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query(`
      SELECT id, interaction_id, call_id, annotation, created_by, created_date
      FROM [dbo].[TblMst_AnnotationTable]
      WHERE interaction_id = ${interactionId}
        AND created_by = ${userId}
      ORDER BY created_date DESC
    `);
    return NextResponse.json({ success: true, annotations: result.recordset });
  } catch (err) {
    console.error("[annotations GET] error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── POST /api/annotations ── */
export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader.split(" ")[1] !== API_SECRET_TOKEN) return authError();

  let body;
  try { body = await request.json(); }
  catch (_) { return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 }); }

  const { interaction_id, annotation, created_by } = body ?? {};

  const iid = toIntStr(interaction_id);
  if (!iid || iid === "0")
    return NextResponse.json({ success: false, message: "interaction_id is required" }, { status: 400 });

  const hasNotes = Array.isArray(annotation?.notes) && annotation.notes.length > 0;
  if (!hasNotes)
    return NextResponse.json({ success: false, message: "annotation notes are required" }, { status: 400 });

  try {
    const pool = await connectToDatabase();

    // Look up call_id from metadata — inline safe integer, no param binding
    let call_id = String(annotation?.callId ?? "");
    try {
      const m = await pool.request().query(
        `SELECT TOP 1 call_id FROM [dbo].[TblMst_Metadata] WHERE interaction_id = ${iid}`
      );
      if (m.recordset[0]?.call_id) call_id = String(m.recordset[0].call_id);
    } catch (e) {
      console.warn("[annotations POST] metadata lookup failed:", e.message);
    }

    const now = new Date();
    const annotationJson = JSON.stringify({
      interactionId: iid,
      callId: call_id,
      savedAt: now.toISOString(),
      notes: annotation.notes.map(n => ({
        note: n.note ?? n.text ?? "",
        recordingTimestamp: n.recordingTimestamp ?? 0,
        recordingTimestampFormatted: n.recordingTimestampFormatted ?? "0:00",
      })),
    });

    const userId = parseInt(String(created_by ?? "0").replace(/[^0-9]/g, ""), 10) || 0;

    // Use request.input(name, value) with no type — let mssql infer (matches working pattern in codebase)
    const req = pool.request();
    req.input("call_id",    call_id);
    req.input("annotation", annotationJson);
    req.input("created_by", userId);

    const ins = await req.query(`
      INSERT INTO [dbo].[TblMst_AnnotationTable]
        (interaction_id, call_id, annotation, created_by, created_date)
      OUTPUT INSERTED.id
      VALUES (${iid}, @call_id, @annotation, @created_by, GETDATE())
    `);

    const newId = ins.recordset[0]?.id;
    console.log("[annotations POST] inserted id:", newId, "for interaction:", iid);
    return NextResponse.json({ success: true, id: newId });

  } catch (err) {
    console.error("[annotations POST] error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/annotations?id=xxx&interactionId=xxx ── */
export async function DELETE(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader.split(" ")[1] !== API_SECRET_TOKEN) return authError();

  const { searchParams } = new URL(request.url);
  const id = toIntStr(searchParams.get("id"));
  const interactionId = toIntStr(searchParams.get("interactionId"));

  if (!id || id === "0")
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });

  try {
    const pool = await connectToDatabase();
    await pool.request().query(`
      DELETE FROM [dbo].[TblMst_AnnotationTable]
      WHERE id = ${id}${interactionId && interactionId !== "0" ? ` AND interaction_id = ${interactionId}` : ""}
    `);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[annotations DELETE] error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
