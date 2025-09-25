/**
 * Rotas de upload de arquivos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from "fastify";
import {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
  getFileInfo,
  healthCheck,
} from "../controllers/uploadController";

/**
 * Plugin de rotas de upload
 */
export default async function uploadRoutes(fastify: FastifyInstance) {
  const deleteFileSchema = {
    params: {
      type: "object",
      required: ["filename"],
      properties: {
        filename: { type: "string", minLength: 1 },
      },
    },
  };

  const getFileInfoSchema = {
    params: {
      type: "object",
      required: ["filename"],
      properties: {
        filename: { type: "string", minLength: 1 },
      },
    },
  };

  // Rotas de upload (sem schema para multipart/form-data)
  fastify.post("/single", healthCheck);
  fastify.post("/multiple", uploadMultipleFiles);

  // Rotas de gerenciamento
  fastify.delete("/:filename", { schema: deleteFileSchema }, deleteFile);
  fastify.get("/info/:filename", { schema: getFileInfoSchema }, getFileInfo);
}
