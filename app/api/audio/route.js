// app/api/audio/route.js
import fs from "fs";
import path from "path";
import AWS from "aws-sdk";
import mime from "mime-types";
import { logAudit } from "@/lib/auditLogger";
import { promisify } from "util";
import { exec } from "child_process";
import { executeStoredProcedure } from "@/lib/mssqldb";
import { isInvalid } from "@/lib/generic";
import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
const execPromise = promisify(exec);

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    let audioUrl = "";
    const { searchParams } = new URL(request.url);
    const actionType = searchParams.get("actionType"); // ✅ moved here
    const fullFilePath = searchParams.get("filePath");
    const interactionId = searchParams.get("interactionId");
    const fileSourceType = searchParams.get("fileSourceType");
    const userName = request.headers.get("userName");
    const loggedInUserId = request.headers.get("loggedInUserId");
    if (isInvalid(loggedInUserId) || isInvalid(fullFilePath)) {
      return NextResponse.json(
        { message: "Headers or Parameter are missing or undefined or empty." },
        { status: 400 },
      );
    }
    // ⭐ PLAY AUDIO AUDIT
    if (interactionId && actionType !== "load") {
      let auditAction = "PLAY_AUDIO";
      let description = "User played audio";

      if (actionType === "download") {
        auditAction = "DOWNLOAD_AUDIO";
        description = "User downloaded audio";
      }

      await logAudit({
        userId: loggedInUserId,
        userName: userName,
        actionType: auditAction,
        interactionId,
        description,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
    }
    if (fileSourceType === "aws-s3") {
      audioUrl = getAWSURL(fullFilePath);
    } else if (fileSourceType === "network") {
      audioUrl = await getNetworkDriveURL(fullFilePath);
    } else if (fileSourceType === "local") {
      audioUrl = getLocalDriveURL(fullFilePath);
    } else if (fileSourceType === "gcp") {
      audioUrl = getGCPURL(fullFilePath);
    }
    return audioUrl;
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function getGCPURL(fullFilePath) {
  try {
    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE, // Path to service account JSON
    });

    const bucketName = process.env.GCP_BUCKET; // e.g., 'my-gcs-bucket'
    const file = storage.bucket(bucketName).file(fullFilePath);
    // Optional: check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(
        `File "${fullFilePath}" does not exist in bucket "${bucketName}".`,
      );
    }

    const options = {
      version: "v4",
      action: "read",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    const [signedUrl] = await file.getSignedUrl(options);

    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch file from GCS");
    }

    const extname = path.extname(fullFilePath).toLowerCase();
    let contentType;

    if (extname === ".mp4") {
      contentType = "video/mp4";
    } else if (extname === ".avi") {
      contentType = "video/x-msvideo";
    } else {
      contentType = "application/octet-stream";
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(
          fullFilePath,
        )}"`,
      },
    });
  } catch (error) {
    console.error(`Error fetching file from GCP: ${error.message}`);
    throw error;
  }
}

// async function getAWSURL(fullFilePath) {
//   try {
//     // fullFilePath = 'QM-Files/9149445718690000631_20230901171306.mp3';
//     const s3 = new AWS.S3({
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//       region: process.env.REGION, // Ensure this matches the actual region of your S3 bucket like 'us-east-1'
//     });

//     const params = {
//       Bucket: process.env.BUCKET, //  'arvius-s3'
//       Key: fullFilePath, // Define file path like'QM-Files/9149445718690000631_20230901171306.mp3',
//       Expires: 60 * 5, // URL expiration time in seconds
//     };

//     const url = await s3.getSignedUrlPromise("getObject", params);
//     const response = await fetch(url); // Fetch the file from the pre-signed URL

//     if (!response.ok) {
//       return NextResponse.json(
//         { error: "Failed to generate url from S3" },
//         { status: 500 }
//       );
//     }
//     // Determine the content type based on the file extension
//     const extname = path.extname(fullFilePath).toLowerCase();
//     let contentType;

//     // Set correct content type for mp4 and avi
//     if (extname === ".mp4") {
//       contentType = "video/mp4";
//     } else if (extname === ".avi") {
//       contentType = "video/x-msvideo";
//     } else {
//       contentType = "application/octet-stream"; // Default fallback for other file types
//     }
//     // const contentType = mime.lookup(fullFilePath) || 'application/octet-stream';
//     // Create a read stream
//     return new Response(response.body, {
//       headers: {
//         "Content-Type": contentType,
//         "Content-Disposition": `inline; filename="${path.basename(
//           fullFilePath
//         )}"`,
//       },
//     });
//   } catch (error) {
//     console.error(`Error fetching file from S3: ${error.message}`);
//     throw error;
//   }
// }
async function getAWSURL(fullFilePath) {
  try {
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });

    const params = {
      Bucket: process.env.BUCKET,
      Key: fullFilePath,
      Expires: 60 * 5,
    };

    // Generate pre-signed URL
    const url = await s3.getSignedUrlPromise("getObject", params);

    // Detect file type
    const ext = path.extname(fullFilePath).toLowerCase();
    let contentType =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".avi"
          ? "video/x-msvideo"
          : "application/octet-stream";

    return new Response(null, {
      headers: {
        "Content-Type": contentType,
        "X-S3-Signed-URL": url, // You can send URL in header
        "Content-Disposition": `inline; filename="${path.basename(
          fullFilePath,
        )}"`,
      },
    });
  } catch (err) {
    console.error("Error generating AWS signed URL:", err);
    return NextResponse.json(
      { error: "Failed to generate AWS signed URL" },
      { status: 500 },
    );
  }
}

async function getNetworkDriveURL(fullFilePath) {
  try {
    const directoryPath = fullFilePath.split("\\");
    const networkUserName = process.env.NETWORKNAME;
    const networkPassword = process.env.NETWORKPASSWORD;
    const rootDir = `\\\\${directoryPath[2]}\\${directoryPath[3]}`;

    const { stdout: netUseOutput } = await execPromise(`net use`);
    if (netUseOutput.includes(rootDir)) {
      // If the drive is mounted, disconnect it

      const { stdout: disconnectOutput, stderr: disconnectError } =
        await execPromise(`net use ${rootDir} /delete`);
      if (disconnectError) {
        throw new Error(
          `Error disconnecting network drive: ${disconnectError}`,
        );
      }
    }
    // Wait for the network drive to be mounted
    const { stdout, stderr } = await execPromise(
      `net use ${rootDir} /user:${networkUserName} ${networkPassword} /persistent:no`,
    );
    if (stderr) {
      throw new Error(`Error mounting network drive: ${stderr}`);
    }

    if (!fs.existsSync(fullFilePath)) {
      return NextResponse.json(
        { message: "audio file not found" },
        { status: 404 },
      );
    }

    const contentType = mime.lookup(fullFilePath) || "application/octet-stream";

    // Create a read stream
    const audioStream = fs.createReadStream(fullFilePath);
    return new Response(audioStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(
          fullFilePath,
        )}"`,
      },
    });
  } catch (error) {
    console.error(`Error fetching file from network drive: ${error.message}`);
    throw error;
  }
}

async function getLocalDriveURL(fullFilePath) {
  try {
    if (!fs.existsSync(fullFilePath)) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const contentType = mime.lookup(fullFilePath) || "application/octet-stream";
    // Create a read stream
    const audioStream = fs.createReadStream(fullFilePath);
    return new Response(audioStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(
          fullFilePath,
        )}"`,
      },
    });
  } catch (error) {
    console.error(`Error fetching file from local system: ${error.message}`);
    throw error;
  }
}
