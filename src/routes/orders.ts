import { FastifyInstance } from "fastify";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  confirmPayment,
  updateOrder,
} from "../controllers/orderController";
import { authenticateToken } from "../middleware/auth";

/**
 * Plugin de rotas de pedidos
 */
export default async function orderRoutes(fastify: FastifyInstance) {
  // Todas as rotas de pedidos requerem autenticação
  fastify.addHook("preHandler", authenticateToken);

  // Rotas de pedidos
  fastify.post("/", createOrder);
  fastify.put("/:orderId", updateOrder);
  fastify.get("/", getUserOrders);
  fastify.get("/:id", getOrderById);
  fastify.post("/:id/confirm-payment", confirmPayment);
}
