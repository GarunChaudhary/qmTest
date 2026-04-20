// app/api/interactions/downloadSelected/route.js

import archiver from "archiver";
import { PassThrough } from "stream";
import fs from "fs";
import { logAudit } from "@/lib/auditLogger";
import { executeStoredProcedure } from "@/lib/mssqldb";
import path from "path";
import AWS from "aws-sdk";
import { Storage } from "@google-cloud/storage";

export const maxDuration = 300;

export async function POST(req) {
  try {
    const loggedInUserId = req.headers.get("loggedInUserId");
    const userName = req.headers.get("userName");
    const body = await req.json();
    const interactions = body.interactionIds || [];

    if (!interactions.length) {
      return new Response("No interactions", { status: 400 });
    }

    const archive = archiver("zip", { zlib: { level: 0 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      archive.abort();
    });

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });

    const gcs = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE,
    });

    const appendFile = async (interaction) => {
      const { fileLocation, fileSourceType, callId } = interaction;
      if (!fileLocation) return;

      const ext = path.extname(fileLocation) || ".mp3";

      try {
        if (fileSourceType === "network" || fileSourceType === "local") {
          if (!fs.existsSync(fileLocation)) return;

          const fileStream = fs.createReadStream(fileLocation);

          return new Promise((resolve, reject) => {
            fileStream.on("end", resolve);
            fileStream.on("error", reject);

            archive.append(fileStream, {
              name: `interaction_${callId}${ext}`,
            });
          });
        }

        if (fileSourceType === "aws-s3") {
          const s3Stream = s3
            .getObject({
              Bucket: process.env.BUCKET,
              Key: fileLocation,
            })
            .createReadStream();

          return new Promise((resolve, reject) => {
            s3Stream.on("end", resolve);
            s3Stream.on("error", reject);

            archive.append(s3Stream, {
              name: `interaction_${callId}${ext}`,
            });
          });
        }

        if (fileSourceType === "gcp") {
          const bucket = gcs.bucket(process.env.GCP_BUCKET);
          const file = bucket.file(fileLocation);
          const gcsStream = file.createReadStream();

          return new Promise((resolve, reject) => {
            gcsStream.on("end", resolve);
            gcsStream.on("error", reject);

            archive.append(gcsStream, {
              name: `interaction_${callId}${ext}`,
            });
          });
        }
      } catch (err) {
        console.warn(`Skipping failed file: ${callId}`);
      }
    };

    const MAX_CONCURRENT = 5;

    (async () => {
      try {
        for (let i = 0; i < interactions.length; i += MAX_CONCURRENT) {
          const chunk = interactions.slice(i, i + MAX_CONCURRENT);
          await Promise.all(chunk.map(appendFile));
        }

        await archive.finalize();
        // ⭐ INSERT AUDIT LOG
        if (loggedInUserId) {
          await logAudit({
            userId: loggedInUserId,
            userName: userName,
            actionType: "BULK_DOWNLOAD",
            description: `Downloaded ${interactions.length} recordings`,
            ipAddress: req.headers.get("x-forwarded-for"),
          });
        }
      } catch (err) {
        console.error("Zip creation error:", err);
        archive.abort();
      }
    })();

    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=Interactions.zip",
      },
    });
  } catch (error) {
    console.error("Bulk download error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
