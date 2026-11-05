import "./config/env.js";
import storage from "./config/storage.js";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const bucket = "assets";
const key = `test/connection-check-${Date.now()}.txt`;
const content = "MLBB Shop Object Storage is working!";

let uploaded = false;

async function testStorage() {
  try {
    // 1. Upload
    await storage.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: "text/plain",
      }),
    );

    uploaded = true;
    console.log("Upload successful!");

    // 2. Download
    const result = await storage.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const downloaded = await result.Body?.transformToString();

    if (downloaded !== content) {
      throw new Error("Downloaded content does not match!");
    }

    console.log("Download successful!");

    // 3. Anonymous public access
    const endpoint = process.env.AWS_ENDPOINT_URL_S3!;

    const response = await fetch(
      `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`,
    );

    if (!response.ok || (await response.text()) !== content) {
      throw new Error(`Public read failed: HTTP ${response.status}`);
    }

    console.log("Public read successful!");
  } catch (error) {
    console.error("Object Storage test failed:", error);
    process.exitCode = 1;
  } finally {
    // Hapus file pengujian agar bucket tetap bersih
    if (uploaded) {
      try {
        await storage.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );

        console.log("Test file deleted successfully!");
      } catch (error) {
        console.error("Failed to delete test file:", error);
        process.exitCode = 1;
      }
    }

    storage.destroy();
  }
}

await testStorage();