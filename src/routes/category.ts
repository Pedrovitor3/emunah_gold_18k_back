import { FastifyInstance } from "fastify";
import {
  getCategories,
  getCategoryById,
  getActiveCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

/**
 * Plugin de rotas de categorias
 */
export default async function categoryRoutes(fastify: FastifyInstance) {
  // Rotas públicas de categorias
  fastify.get("/", getCategories);
  fastify.get("/active", getActiveCategories);
  fastify.get("/:id", getCategoryById);

  // Rotas administrativas (CRUD)
  fastify.post(
    "/",
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    createCategory
  );
  fastify.put(
    "/:id",
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    updateCategory
  );
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    deleteCategory
  );
}
