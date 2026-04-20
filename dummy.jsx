// app/api/uploadProfilePicture/route.js
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { executeStoredProcedure } from "@/lib/mssqldb";

export const dynamic = "force-dynamic";

// ✅ This tells Next.js NOT to parse body automatically
export const config = {
  api: { bodyParser: false },
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req) {
  try {
    // ✅ Manually parse as formData
    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      return NextResponse.json(
        { message: "Request must be multipart/form-data" },
        { status: 400 }
      );
    }

    const file   = formData.get("file");
    const userId = formData.get("userId");

    // ── Validation ──────────────────────────────────────────────
    if (!file || !userId) {
      return NextResponse.json(
        { message: "Missing file or userId" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Only JPG, PNG, WEBP, GIF allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { message: `File too large. Max size is ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // ── Save file to /public/uploads/profiles/ ──────────────────
    const ext = file.name.split(".").pop();
    const fileName = `profile_${userId}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    const picturePath = `/uploads/profiles/${fileName}`;

    // ── Update DB via stored procedure ──────────────────────────
    await executeStoredProcedure("usp_UpdateProfilePicture", {
      UserId: parseInt(userId),
      PicturePath: picturePath,
    });

    return NextResponse.json(
      { message: "Profile picture updated", picturePath },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}