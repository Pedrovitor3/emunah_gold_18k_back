/**
 * Rotas de pedidos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import { createPixPayment } from "../controllers/paymentController";

/**
 * Plugin de rotas de pedidos
 */
export default async function paymentRoutes(fastify: FastifyInstance) {
  // Todas as rotas de pedidos requerem autenticação
  fastify.addHook("preHandler", authenticateToken);

  fastify.post("/pix", createPixPayment);
}
