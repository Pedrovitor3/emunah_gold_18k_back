/**
 * Controller de upload de arquivos - Versão Unificada
 * Emunah Gold 18K - Backend
 */

import { FastifyRequest, FastifyReply } from "fastify";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import type { MultipartFile } from "@fastify/multipart";

// ========================================
// CONFIGURAÇÃO DO S3
// ========================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME =
  process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "emunah-gold-bucket";
const REGION = process.env.AWS_REGION || "eu-north-1";

// ========================================
// VALIDAÇÕES
// ========================================

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const validateFile = (file: MultipartFile): void => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(
      `Tipo não permitido: ${file.mimetype}. Use: ${ALLOWED_TYPES.join(", ")}`
    );
  }

  // Nota: o tamanho será verificado pelo limite do fastify-multipart
  // Mas podemos adicionar validação adicional se necessário
};

// ========================================
// UTILITÁRIOS
// ========================================

export const generateUniqueFileName = (
  originalName: string,
  folder: string = "products"
): string => {
  const timestamp = Date.now();
  const randomString = uuidv4().substring(0, 8);

  // Sanitizar nome do arquivo de forma mais agressiva
  const sanitizeName = (name: string): string => {
    return name
      .normalize("NFD") // Decompor acentos (á → a + ´)
      .replace(/[\u0300-\u036f]/g, "") // Remover marcas diacríticas
      .toLowerCase() // Minúsculas
      .replace(/[^a-z0-9.-]/g, "_") // Apenas alfanuméricos, ponto e hífen
      .replace(/_{2,}/g, "_") // Remover underscores duplicados
      .replace(/^_+|_+$/g, ""); // Remover underscores das pontas
  };

  const sanitizedName = sanitizeName(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  const baseName = path.basename(sanitizedName, extension).substring(0, 30);

  return `${folder}/${timestamp}-${randomString}-${baseName}${extension}`;
};

// ========================================
// UPLOAD PARA S3
// ========================================

export const uploadToS3 = async (
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  originalName: string
) => {
  const Key = filename.replace(/^\/+/, "");

  // ⚠️ CRÍTICO: Sanitizar metadados - S3 não aceita caracteres especiais em headers
  const sanitizeMetadata = (value: string): string => {
    return value
      .normalize("NFD") // Decompor acentos
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/[^\x20-\x7E]/g, "") // Manter apenas ASCII imprimível
      .replace(/[<>:"\/\\|?*]/g, "-") // Substituir caracteres inválidos
      .substring(0, 200); // Limitar tamanho (AWS limite)
  };

  const sanitizedOriginalName = sanitizeMetadata(originalName);

  // Log para debug
  if (originalName !== sanitizedOriginalName) {
    console.log("🔧 Nome sanitizado:", {
      original: originalName,
      sanitized: sanitizedOriginalName,
    });
  }

  const params: any = {
    Bucket: BUCKET_NAME,
    Key,
    Body: fileBuffer,
    ContentType: mimetype,
    Metadata: {
      originalname: sanitizedOriginalName, // lowercase e sanitizado
      uploadedat: new Date().toISOString().replace(/[:.]/g, "-"), // Sem caracteres especiais
      filesize: String(fileBuffer.length),
    },
  };

  if (process.env.S3_SERVER_SIDE_ENCRYPTION) {
    params.ServerSideEncryption = process.env.S3_SERVER_SIDE_ENCRYPTION;
    if (process.env.S3_KMS_KEY_ID)
      params.SSEKMSKeyId = process.env.S3_KMS_KEY_ID;
  }

  try {
    const cmd = new PutObjectCommand(params);
    await s3Client.send(cmd);

    const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${encodeURIComponent(
      Key
    )}`;

    return { success: true, url, key: Key };
  } catch (err: any) {
    console.error("❌ Erro no upload S3:", err);
    throw new Error(`Falha no upload: ${err?.message || err}`);
  }
};

// ========================================
// PROCESSAR UM ARQUIVO
// ========================================

const processFile = async (
  file: MultipartFile,
  folder: string = "products"
) => {
  try {
    validateFile(file);

    const buffer = await file.toBuffer();
    const filename = generateUniqueFileName(file.filename, folder);

    const result = await uploadToS3(
      buffer,
      filename,
      file.mimetype,
      file.filename
    );

    return {
      success: true,
      url: result.url,
      filename,
      originalName: file.filename,
      size: buffer.length,
    };
  } catch (err: any) {
    return {
      success: false,
      originalName: file?.filename || "unknown",
      message: err?.message || String(err),
    };
  }
};

// ========================================
// UPLOAD UNIFICADO (1 OU MAIS ARQUIVOS)
// ========================================

export const uploadFiles = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const folder = "products";
    const results: any[] = [];
    let fileCount = 0;

    // Verificar se há multipart data
    if (!request.isMultipart()) {
      return reply.code(400).send({
        success: false,
        message: "Request deve ser multipart/form-data",
      });
    }

    // Processar todas as partes do multipart
    for await (const part of request.parts()) {
      // Type guard: verificar se é um arquivo
      if (part.type === "file") {
        fileCount++;
        const file = part as MultipartFile;
        const result = await processFile(file, folder);
        results.push(result);
      }
      // Campos de formulário são ignorados (part.type === "field")
    }

    // Validar se algum arquivo foi enviado
    if (fileCount === 0) {
      return reply.code(400).send({
        success: false,
        message: "Nenhum arquivo fornecido",
      });
    }

    // Verificar se todos os uploads falharam
    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    if (successfulUploads.length === 0) {
      return reply.code(400).send({
        success: false,
        message: "Todos os uploads falharam",
        errors: failedUploads,
      });
    }

    // Resposta única ou múltipla
    if (results.length === 1) {
      // Upload único
      return reply.send(results[0]);
    } else {
      // Upload múltiplo
      return reply.send({
        success: true,
        total: results.length,
        successful: successfulUploads.length,
        failed: failedUploads.length,
        files: results,
      });
    }
  } catch (error: any) {
    console.error("❌ Erro no upload:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro interno do servidor",
    });
  }
};

// ========================================
// DELETAR ARQUIVO
// ========================================

interface DeleteFileParams {
  filename: string;
}

export const deleteFile = async (
  request: FastifyRequest<{ Params: DeleteFileParams }>,
  reply: FastifyReply
) => {
  try {
    const { filename } = request.params;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });

    await s3Client.send(command);

    return reply.send({
      success: true,
      message: "Arquivo deletado com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro ao deletar:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro ao deletar arquivo",
    });
  }
};

// ========================================
// INFORMAÇÕES DO ARQUIVO
// ========================================

interface GetFileInfoParams {
  filename: string;
}

export const getFileInfo = async (
  request: FastifyRequest<{ Params: GetFileInfoParams }>,
  reply: FastifyReply
) => {
  try {
    const { filename } = request.params;

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });

    const result = await s3Client.send(command);

    return reply.send({
      success: true,
      filename,
      size: result.ContentLength,
      lastModified: result.LastModified,
      contentType: result.ContentType,
      metadata: result.Metadata,
    });
  } catch (error: any) {
    if (error.name === "NotFound") {
      return reply.code(404).send({
        success: false,
        message: "Arquivo não encontrado",
      });
    }

    console.error("❌ Erro ao obter info:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro ao obter informações",
    });
  }
};

// ========================================
// HEALTH CHECK
// ========================================

export const healthCheck = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const startTime = Date.now();

  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: BUCKET_NAME,
      })
    );

    return reply.send({
      success: true,
      service: "AWS S3",
      region: process.env.AWS_REGION,
      bucket: BUCKET_NAME,
      status: "healthy",
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ S3 Health Check falhou:", error);

    return reply.code(503).send({
      success: false,
      service: "AWS S3",
      status: "unhealthy",
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }
};
