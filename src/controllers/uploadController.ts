/**
 * Controller de upload de arquivos
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

// Configuração do S3
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

// Validação das variáveis de ambiente obrigatórias
const validateEnvironment = () => {
  const requiredVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    BUCKET_NAME: BUCKET_NAME,
  };

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não encontradas: ${missing.join(
        ", "
      )}`
    );
  }

  return true;
};

// Validar no carregamento do módulo
validateEnvironment();

// Tipos
interface DeleteFileParams {
  filename: string;
}

interface GetFileInfoParams {
  filename: string;
}

// Validações
const validateFile = (file: any): void => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(
      `Tipo de arquivo não permitido: ${
        file.mimetype
      }. Use: ${allowedTypes.join(", ")}`
    );
  }

  // Para Fastify multipart, o tamanho está em file._buf?.length ou podemos verificar durante o toBuffer()
  if (file._buf && file._buf.length > maxSize) {
    const sizeMB = (file._buf.length / (1024 * 1024)).toFixed(2);
    throw new Error(`Arquivo muito grande: ${sizeMB}MB. Tamanho máximo: 5MB.`);
  }
};

// Gerar nome único do arquivo
const generateUniqueFileName = (
  originalName: string,
  folder: string = "products"
): string => {
  const timestamp = Date.now();
  const randomString = uuidv4().substring(0, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const extension = path.extname(sanitizedName).toLowerCase();
  const baseName = path.basename(sanitizedName, extension).substring(0, 20);

  return `${folder}/${timestamp}-${randomString}-${baseName}${extension}`;
};

// Upload para S3
export const uploadToS3 = async (
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  originalName: string
) => {
  const Key = filename.replace(/^\/+/, "");

  const params: any = {
    Bucket: BUCKET_NAME,
    Key,
    Body: fileBuffer,
    ContentType: mimetype,
    Metadata: {
      originalName,
      uploadedAt: new Date().toISOString(),
      size: String(fileBuffer.length),
    },
  };

  // Se o bucket exigir server-side encryption
  if (process.env.S3_SERVER_SIDE_ENCRYPTION) {
    params.ServerSideEncryption = process.env.S3_SERVER_SIDE_ENCRYPTION; // 'AES256' ou 'aws:kms'
    if (process.env.S3_KMS_KEY_ID)
      params.SSEKMSKeyId = process.env.S3_KMS_KEY_ID;
  }

  try {
    const cmd = new PutObjectCommand(params);
    const res = await s3Client.send(cmd);

    const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${encodeURIComponent(
      Key
    )}`;

    return { success: true, url, key: Key, raw: res };
  } catch (err: any) {
    console.error("Erro no upload S3:", err);
    throw new Error(
      `Falha no upload para S3: [${err?.name || "Unknown"}] ${
        err?.message || err
      }`
    );
  }
};

/**
 * Upload de arquivo único
 */
export const uploadSingleFile = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        success: false,
        message: "Nenhum arquivo fornecido",
      });
    }

    // Validar arquivo
    validateFile(data);

    // Ler buffer do arquivo
    const fileBuffer = await data.toBuffer();

    // Usar folder padrão (pode ser ajustado conforme necessário)
    const folder = "products";

    const filename = generateUniqueFileName(data.filename, folder);

    // Upload para S3
    const uploadResult = await uploadToS3(
      fileBuffer,
      filename,
      data.mimetype,
      data.filename
    );

    return reply.send({
      success: true,
      url: uploadResult.url,
      filename,
      originalName: data.filename,
      size: fileBuffer.length,
    });
  } catch (error: any) {
    console.error("Erro detalhado no upload:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return reply.code(500).send({
      success: false,
      message: error.message || "Erro interno do servidor",
    });
  }
};

// Upload múltiplo para S3 — controller
export const uploadMultipleFiles = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // obter partes do multipart (pode ser AsyncIterable ou array)
    const parts = (request as any).files ? (request as any).files() : null;

    if (!parts) {
      return reply.code(400).send({
        success: false,
        message: "Nenhum arquivo fornecido",
      });
    }

    const results: Array<any> = [];
    const folder = "products"; // ajuste conforme necessário

    // helper para processar um arquivo individual
    const processFile = async (file: any) => {
      try {
        validateFile(file); // sua validação existente

        const buffer: Buffer = await file.toBuffer();
        const filename = generateUniqueFileName(file.filename, folder);

        const uploadResult = await uploadToS3(
          buffer,
          filename,
          file.mimetype,
          file.filename
        );

        return {
          success: true,
          url: uploadResult.url,
          filename,
          originalName: file.filename,
          size: buffer.length,
        };
      } catch (err: any) {
        // erro no arquivo individual — não quebra os outros uploads
        return {
          success: false,
          originalName: file?.filename,
          message: err?.message || String(err),
        };
      }
    };

    // Se parts for um AsyncIterable (fastify-multipart padrão)
    if (typeof (parts as any)[Symbol.asyncIterator] === "function") {
      for await (const file of parts as AsyncIterable<any>) {
        // alguns clients podem enviar campos não-file — pular se não for file
        if (!file || !file.filename) {
          continue;
        }
        const r = await processFile(file);
        results.push(r);
      }
    } else if (Array.isArray(parts)) {
      // se for array (caso configurado assim)
      for (const file of parts) {
        if (!file || !file.filename) continue;
        const r = await processFile(file);
        results.push(r);
      }
    } else {
      // fallback: tentar tratar como um único arquivo
      const single = parts;
      if (!single || !single.filename) {
        return reply.code(400).send({
          success: false,
          message: "Nenhum arquivo válido encontrado no multipart",
        });
      }
      results.push(await processFile(single));
    }

    if (results.length === 0) {
      return reply.code(400).send({
        success: false,
        message: "Nenhum arquivo processado",
      });
    }

    return reply.send({
      success: true,
      files: results,
    });
  } catch (error: any) {
    console.error("Erro detalhado no upload múltiplo:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });

    return reply.code(500).send({
      success: false,
      message: error?.message || "Erro interno do servidor",
    });
  }
};

/**
 * Deletar arquivo
 */
export const deleteFile = async (
  request: FastifyRequest<{ Params: DeleteFileParams }>,
  reply: FastifyReply
) => {
  try {
    const { filename } = request.params;

    // Deletar do S3
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: filename,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return reply.send({
      success: true,
      message: "Arquivo deletado com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao deletar arquivo:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro ao deletar arquivo",
    });
  }
};

/**
 * Obter informações do arquivo
 */
export const getFileInfo = async (
  request: FastifyRequest<{ Params: GetFileInfoParams }>,
  reply: FastifyReply
) => {
  try {
    const { filename } = request.params;

    // Verificar se arquivo existe no S3
    const headParams = {
      Bucket: BUCKET_NAME,
      Key: filename,
    };

    const command = new HeadObjectCommand(headParams);
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

    console.error("Erro ao obter informações do arquivo:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro ao obter informações do arquivo",
    });
  }
};

// Função para verificar saúde do S3
const checkS3Health = async () => {
  const startTime = Date.now();

  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: BUCKET_NAME,
      })
    );

    return {
      status: "healthy",
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    // Capturar detalhes completos do erro
    const errorDetails = {
      name: error.name || "UnknownError",
      message: error.message || "Erro desconhecido",
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      // Não incluir stack em produção por segurança
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };

    console.error("Erro detalhado no S3 Health Check:", errorDetails);

    return {
      status: "unhealthy",
      error: errorDetails,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
};
/**
 * Health check da conexão com AWS S3
 */
export const healthCheck = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const s3Health = await checkS3Health();

    return reply.send({
      success: s3Health.status === "healthy",
      service: "AWS S3",
      region: process.env.AWS_REGION,
      bucket: BUCKET_NAME,
      ...s3Health,
    });
  } catch (error: any) {
    console.error("Erro no health check:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro no health check",
    });
  }
};
