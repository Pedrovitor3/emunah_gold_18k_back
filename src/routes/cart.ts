/**
 * Rotas do carrinho de compras
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from "fastify";
import {
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController";
import { authenticateToken } from "../middleware/auth";

/**
 * Plugin de rotas do carrinho
 */
export default async function cartRoutes(fastify: FastifyInstance) {
  // Todas as rotas do carrinho requerem autenticação
  fastify.addHook("preHandler", authenticateToken);

  // Rotas do carrinho
  fastify.get("/", getCartItems);
  fastify.post("/", addToCart);
  fastify.put("/:productId", updateCartItem);
  fastify.delete("/:productId", removeFromCart);
  fastify.delete("/", clearCart);
}
