import "./env.js";
import { S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is missing`);
  }

  return value;
}

const storage = new S3Client({
  region: requiredEnv("AWS_REGION"),
  endpoint: requiredEnv("AWS_ENDPOINT_URL_S3"),
  credentials: {
    accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
});

export default storage;