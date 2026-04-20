import fs from "fs";
import fsPromises from "fs/promises";
import { promisify } from "util";
import { exec } from "child_process";
import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";
import { isInvalid } from "@/lib/generic";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const execPromise = promisify(exec);
export const dynamic = "force-dynamic";

// Numeric DB values → string type names (in case DB stores 1/2/3/4)
const NUMERIC_TYPE_MAP = { "1": "network", "2": "local", "3": "aws-s3", "4": "gcp" };

function resolveSourceType(rawType, filePath) {
  let t = (rawType || "").toLowerCase().trim();

  // Map numeric DB values
  if (NUMERIC_TYPE_MAP[t]) t = NUMERIC_TYPE_MAP[t];

  // If already a known type, use it
  const known = ["aws-s3", "network", "local", "gcp"];
  if (known.includes(t)) return t;

  // Auto-detect from path
  if (filePath.startsWith("\\\\") || filePath.startsWith("//")) return "network";
  if (filePath.startsWith("gs://")) return "gcp";
  if (filePath.startsWith("s3://")) return "aws-s3";

  // Default: local (absolute Windows/Unix path or relative)
  return "local";
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    const rawSourceType = searchParams.get("fileSourceType");

    if (isInvalid(filePath)) {
      return NextResponse.json(
        { message: "path parameter is missing or invalid." },
        { status: 400 }
      );
    }

    const fileSourceType = resolveSourceType(rawSourceType, filePath);
    console.log(`[read-transcription] path="${filePath}" resolved sourceType="${fileSourceType}"`);

    let transcriptionData = null;

    if (fileSourceType === "aws-s3") {
      transcriptionData = await getAWSTranscription(filePath);
    } else if (fileSourceType === "network") {
      transcriptionData = await getNetworkTranscription(filePath);
    } else if (fileSourceType === "local") {
      transcriptionData = await getLocalTranscription(filePath);
    } else if (fileSourceType === "gcp") {
      transcriptionData = await getGCPTranscription(filePath);
    }

    return NextResponse.json(transcriptionData);
  } catch (error) {
    console.error("Error reading transcription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to read transcription file" },
      { status: 500 }
    );
  }
}

/* ── AWS S3 ── */
async function getAWSTranscription(fullFilePath) {
  const s3 = new S3Client({
    region: process.env.REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const response = await s3.send(new GetObjectCommand({ Bucket: process.env.BUCKET, Key: fullFilePath }));
  const jsonText = await streamToString(response.Body);
  return JSON.parse(jsonText);
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

/* ── GCP ── */
async function getGCPTranscription(fullFilePath) {
  const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_FILE,
  });
  const file = storage.bucket(process.env.GCP_BUCKET).file(fullFilePath);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`File "${fullFilePath}" not found in GCP bucket.`);
  const [contents] = await file.download();
  return JSON.parse(contents.toString("utf-8"));
}

/* ── Network Drive ── */
async function getNetworkTranscription(fullFilePath) {
  const parts = fullFilePath.split("\\");
  const rootDir = `\\\\${parts[2]}\\${parts[3]}`;
  const { stdout } = await execPromise("net use");
  if (stdout.includes(rootDir)) await execPromise(`net use ${rootDir} /delete`);
  const { stderr } = await execPromise(
    `net use ${rootDir} /user:${process.env.NETWORKNAME} ${process.env.NETWORKPASSWORD} /persistent:no`
  );
  if (stderr) throw new Error(`Error mounting network drive: ${stderr}`);
  if (!fs.existsSync(fullFilePath)) throw new Error("Transcription file not found on network drive");
  const fileContent = await fsPromises.readFile(fullFilePath, "utf-8");
  return JSON.parse(fileContent);
}

/* ── Local ── */
async function getLocalTranscription(fullFilePath) {
  if (!fs.existsSync(fullFilePath)) {
    return { error: "No transcription available for this interaction.", notFound: true };
  }
  const raw = await fsPromises.readFile(fullFilePath, "utf-8");
  // Strip JS-style comments before parsing — handles dirty JSON files
  const cleaned = raw.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(cleaned);
}
