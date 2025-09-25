/**
 * Rotas de autenticação
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from 'fastify';
import { register, login, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

/**
 * Plugin de rotas de autenticação
 */
export default async function authRoutes(fastify: FastifyInstance) {
  // Esquemas de validação
  const registerSchema = {
    body: {
      type: 'object',
      required: ['email', 'password', 'first_name', 'last_name'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
        first_name: { type: 'string', minLength: 2 },
        last_name: { type: 'string', minLength: 2 },
        phone: { type: 'string' }
      }
    }
  };

  const loginSchema = {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 1 }
      }
    }
  };

  // Rotas públicas
  fastify.post('/register', { schema: registerSchema }, register);
  fastify.post('/login', { schema: loginSchema }, login);

  // Rotas protegidas
  fastify.register(async function protectedRoutes(fastify) {
    // Aplica middleware de autenticação para todas as rotas deste grupo
    fastify.addHook('preHandler', authenticateToken);

    fastify.get('/profile', getProfile);
  });
}

