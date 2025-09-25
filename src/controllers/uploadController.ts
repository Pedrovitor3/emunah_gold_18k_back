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
  process.env.BUCKET_NAME ||
  process.env.AWS_BUCKET_NAME ||
  "emunah-gold-bucket";

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
const uploadToS3 = async (
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  originalName: string
) => {
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: "public-read" as const,
    Metadata: {
      originalName,
      uploadedAt: new Date().toISOString(),
      size: fileBuffer.length.toString(),
    },
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const fileUrl = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${filename}`;

    return {
      success: true,
      url: fileUrl,
      key: filename,
    };
  } catch (error) {
    console.error("Erro no upload S3:", error);
    throw new Error("Falha no upload para S3");
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

/**
 * Upload de múltiplos arquivos
 */
export const uploadMultipleFiles = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const parts = request.parts();
    const fileArray: any[] = [];
    let folder = "products";

    for await (const part of parts) {
      if (part.type === "field" && part.fieldname === "folder") {
        folder = part.value as string;
      } else if (part.type === "file") {
        fileArray.push(part);
      }
    }

    if (fileArray.length === 0) {
      return reply.code(400).send({
        success: false,
        message: "Nenhum arquivo fornecido",
      });
    }

    if (fileArray.length > 5) {
      return reply.code(400).send({
        success: false,
        message: "Máximo de 5 arquivos permitidos",
      });
    }

    const uploads = [];
    const failed = [];

    // Processar cada arquivo
    for (const file of fileArray) {
      try {
        // Validar arquivo
        validateFile(file);

        // Ler buffer do arquivo
        const fileBuffer = await file.toBuffer();
        const filename = generateUniqueFileName(file.filename, folder);

        // Upload para S3
        const uploadResult = await uploadToS3(
          fileBuffer,
          filename,
          file.mimetype,
          file.filename
        );

        uploads.push({
          success: true,
          url: uploadResult.url,
          filename,
          originalName: file.filename,
          size: fileBuffer.length,
        });
      } catch (error: any) {
        failed.push({
          file: file.filename,
          error: error.message,
        });
      }
    }

    return reply.send({
      success: failed.length === 0,
      uploads,
      ...(failed.length > 0 && { failed }),
    });
  } catch (error: any) {
    console.error("Erro no upload múltiplo:", error);
    return reply.code(500).send({
      success: false,
      message: error.message || "Erro interno do servidor",
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
