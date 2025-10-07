/**
 * Rotas de produtos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from "fastify";
import {
  getProducts,
  getProductById,
  getCategories,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

/**
 * Plugin de rotas de produtos
 */
export default async function productRoutes(fastify: FastifyInstance) {
  // Rotas públicas de produtos (sem autenticação)
  fastify.get("/", getProducts);
  fastify.get("/featured", getFeaturedProducts);
  fastify.get("/categories", getCategories);
  fastify.get("/:id", getProductById);

  // Rotas protegidas - Requerem autenticação e privilégios de admin
  fastify.post(
    "/",
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    createProduct
  );

  fastify.put(
    "/:id",
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    updateProduct
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    deleteProduct
  );
}
