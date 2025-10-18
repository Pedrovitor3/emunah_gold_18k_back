import { FastifyInstance } from "fastify";

import {
  CorreioAutenticContact,
  CorreioCalcularFreteContact,
} from "../controllers/correiosController";

/**
 * Rotas de upload de arquivos
 * Emunah Gold 18K - Backend
 */
export default async function correiosRoutes(fastify: FastifyInstance) {
  fastify.post("/auth", CorreioAutenticContact);
  fastify.post("/calculate", CorreioCalcularFreteContact);
}
