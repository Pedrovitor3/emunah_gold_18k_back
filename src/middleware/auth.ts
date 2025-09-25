/**
 * Middleware de autenticação
 * Emunah Gold 18K - Backend
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { extractTokenFromHeader, verifyToken } from '../utils/auth';
import { JwtPayload } from '../models/types';

/**
 * Estende o tipo FastifyRequest para incluir user
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload | undefined;
  }
}

/**
 * Middleware para verificar autenticação
 * @param request - Requisição Fastify
 * @param reply - Resposta Fastify
 */
export const authenticateToken = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Token de acesso requerido'
      });
    }

    const payload = verifyToken(token);
    request.user = payload;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware para verificar se o usuário é administrador
 * @param request - Requisição Fastify
 * @param reply - Resposta Fastify
 */
export const requireAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.isAdmin) {
    return reply.status(403).send({
      success: false,
      error: 'Acesso negado. Privilégios de administrador requeridos.'
    });
  }
};

/**
 * Middleware opcional de autenticação (não retorna erro se não autenticado)
 * @param request - Requisição Fastify
 * @param reply - Resposta Fastify
 */
export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyToken(token);
      request.user = payload;
    }
  } catch (error) {
    // Ignora erros de token em autenticação opcional
    request.user = undefined;
  }
};

