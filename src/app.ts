/**
 * Aplicação principal do backend
 * Emunah Gold 18K - Backend
 */

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import dotenv from "dotenv";
import { FastifyRequest, FastifyReply, FastifyError } from "fastify";
import Fastify from "fastify";

// Importar rotas
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import trackingRoutes from "./routes/tracking";
import { initializeDatabase } from "./config/database";
import categoryRoutes from "./routes/category";
import uploadRoutes from "./routes/upload";
import { pipeline } from "stream";
import type { FastifyInstance } from "fastify";
import userRoutes from "./routes/user";
import correiosRoutes from "./routes/correios";
const fs = require("fs");
const util = require("util");
const pump = util.promisify(pipeline);

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Cria e configura a instância do Fastify
 */
const createApp = async (): Promise<FastifyInstance> => {
  // Criar instância do Fastify com configurações
  const fastify = Fastify({
    logger: true,
  });

  // Registrar plugins
  await fastify.register(cors, {
    origin: true, // Permite todas as origens em desenvolvimento
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: 10000000, // 10MB
      files: 5,
      headerPairs: 2000,
    },
    attachFieldsToBody: false, // Importante!
  });
  // Middleware global para logging de requisições
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      request.log.info(
        {
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        },
        "Incoming request"
      );
    }
  );

  // Middleware global para tratamento de erros
  fastify.setErrorHandler(
    async (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      request.log.error(error, "Unhandled error");

      // Não expor detalhes do erro em produção
      const message =
        process.env.NODE_ENV === "production"
          ? "Erro interno do servidor"
          : error.message;

      reply.status(500).send({
        success: false,
        error: message,
      });
    }
  );

  // Rota de health check
  fastify.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const dbConnected = await initializeDatabase();

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: dbConnected ? "connected" : "disconnected",
        version: process.env.npm_package_version || "1.0.0",
      };
    }
  );

  // Registrar rotas da API
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(productRoutes, { prefix: "/products" });
  await fastify.register(cartRoutes, { prefix: "/cart" });
  await fastify.register(orderRoutes, { prefix: "/orders" });
  await fastify.register(trackingRoutes, { prefix: "/tracking" });
  await fastify.register(categoryRoutes, { prefix: "/category" });
  await fastify.register(uploadRoutes, { prefix: "/upload" });
  await fastify.register(userRoutes, { prefix: "/user" });
  await fastify.register(correiosRoutes, { prefix: "/correios" });

  // Rota 404 personalizada
  fastify.setNotFoundHandler(
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.status(404).send({
        success: false,
        error: "Rota não encontrada",
        path: request.url,
      });
    }
  );

  // REMOVE the fastify.listen() call from here!
  // It should only be called in server.ts

  return fastify;
};

export default createApp;
