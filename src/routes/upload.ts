import { FastifyInstance } from "fastify";
import {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
  getFileInfo,
  healthCheck,
} from "../controllers/uploadController";

/**
 * Rotas de upload de arquivos
 * Emunah Gold 18K - Backend
 */
export default async function uploadRoutes(fastify: FastifyInstance) {
  // Health check da conexão S3
  fastify.get("/health", healthCheck);

  // Upload de arquivo único
  fastify.post("/single", uploadSingleFile);

  // Upload de múltiplos arquivos
  fastify.post("/multiple", uploadMultipleFiles);

  // Deletar arquivo
  fastify.delete("/:filename", deleteFile);

  // Obter informações do arquivo
  fastify.get("/:filename", getFileInfo);
}
