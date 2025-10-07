/**
 * Rotas de imagens de produtos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from "fastify";
import {
  createProductImage,
  deleteProductImage,
  updateImageOrder,
} from "../controllers/productImageController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

/**
 * Plugin de rotas de imagens de produtos
 */
export default async function productImageRoutes(fastify: FastifyInstance) {
  // Todas as rotas requerem autenticação E privilégios de admin
  fastify.addHook("preHandler", authenticateToken);
  fastify.addHook("preHandler", requireAdmin);

  // Rotas administrativas (CRUD)
  fastify.post(
    "/",

    createProductImage
  );
  fastify.delete(
    "/:id",

    deleteProductImage
  );

  // Rota para reordenar imagens
  fastify.put(
    "/product/:productId/order",

    updateImageOrder
  );
}
