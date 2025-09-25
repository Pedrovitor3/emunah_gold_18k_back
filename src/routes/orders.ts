/**
 * Rotas de pedidos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from 'fastify';
import { 
  createOrder,
  getUserOrders,
  getOrderById,
  confirmPayment
} from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';

/**
 * Plugin de rotas de pedidos
 */
export default async function orderRoutes(fastify: FastifyInstance) {
  // Todas as rotas de pedidos requerem autenticação
  fastify.addHook('preHandler', authenticateToken);

  // Esquemas de validação
  const createOrderSchema = {
    body: {
      type: 'object',
      required: ['payment_method', 'shipping_address'],
      properties: {
        payment_method: { 
          type: 'string', 
          enum: ['credit_card', 'pix'] 
        },
        shipping_address: {
          type: 'object',
          required: ['street', 'number', 'neighborhood', 'city', 'state', 'zip_code'],
          properties: {
            street: { type: 'string', minLength: 1 },
            number: { type: 'string', minLength: 1 },
            complement: { type: 'string' },
            neighborhood: { type: 'string', minLength: 1 },
            city: { type: 'string', minLength: 1 },
            state: { type: 'string', minLength: 2, maxLength: 2 },
            zip_code: { type: 'string', pattern: '^[0-9]{5}-?[0-9]{3}$' }
          }
        },
        notes: { type: 'string' }
      }
    }
  };

  const getOrderByIdSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  };

  const confirmPaymentSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  };

  // Rotas de pedidos
  fastify.post('/', { schema: createOrderSchema }, createOrder);
  fastify.get('/', getUserOrders);
  fastify.get('/:id', { schema: getOrderByIdSchema }, getOrderById);
  fastify.post('/:id/confirm-payment', { schema: confirmPaymentSchema }, confirmPayment);
}

