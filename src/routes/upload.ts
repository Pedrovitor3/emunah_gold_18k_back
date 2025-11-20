import { FastifyInstance } from "fastify";
import {
  deleteFile,
  getFileInfo,
  healthCheck,
} from "../controllers/uploadController";

export default async function uploadRoutes(fastify: FastifyInstance) {
  // Health check da conexão S3
  fastify.get("/health", healthCheck);

  // Deletar arquivo
  fastify.delete("/:filename", deleteFile);

  // Obter informações do arquivo
  fastify.get("/:filename", getFileInfo);
}
