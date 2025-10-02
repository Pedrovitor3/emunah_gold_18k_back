// src/scripts/test-s3-upload.ts
import fs from "fs";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3"; // ajuste o caminho se necessário

const BUCKET = process.env.S3_BUCKET ?? "emunah-gold-bucket";

async function main() {
  const testFilePath = path.join(process.cwd(), "small-test-file.txt");
  let body: Buffer;

  if (fs.existsSync(testFilePath)) {
    body = fs.readFileSync(testFilePath);
    console.log("Usando arquivo:", testFilePath);
  } else {
    body = Buffer.from(`generated-test-${Date.now()}`);
    console.log("Arquivo não encontrado — usando buffer gerado");
  }

  try {
    const res = await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `tests/test-${Date.now()}.txt`,
        Body: body,
        ContentType: "text/plain",
        ACL: "private",
      })
    );
    console.log("Upload OK:", res);
  } catch (err: any) {
    console.error("Erro de upload S3 — nome:", err?.name);
    console.error("Mensagem:", err?.message);
    console.error("$metadata:", err?.$metadata);
    console.error("Erro completo:", err);
    process.exit(1);
  }
}

main();
