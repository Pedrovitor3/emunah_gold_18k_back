import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import {
  createCheckoutSession,
  createPaymentIntent,
  verifyCheckoutSession,
  createPreference,
} from "../controllers/paymentController";

/**
 * Plugin de rotas de pedidos
 */
export default async function paymentRoutes(fastify: FastifyInstance) {
  // Todas as rotas de pedidos requerem autenticação
  fastify.addHook("preHandler", authenticateToken);

  fastify.post("/stripe/checkout", {
    handler: createCheckoutSession,
  });
  fastify.post("/stripe/payment-intent", {
    handler: createPaymentIntent,
  });

  // Verificar status da sessão
  fastify.get("/stripe/verify", {
    handler: verifyCheckoutSession,
  });

  fastify.post("/create-preference", {
    handler: createPreference,
  });
}
