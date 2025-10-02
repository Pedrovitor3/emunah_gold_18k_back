// src/config/s3.ts
import dotenv from "dotenv";
dotenv.config(); // <- garante que .env seja lido quando esse módulo for importado

import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? "eu-north-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = process.env.AWS_SESSION_TOKEN;

export const s3Client = new S3Client({
  region,
  ...(accessKeyId && secretAccessKey
    ? {
        credentials: {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken && { sessionToken }),
        },
      }
    : {}),
});
