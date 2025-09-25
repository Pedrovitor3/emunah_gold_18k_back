/**
 * Rotas do carrinho de compras
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from 'fastify';
import { 
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController';
import { authenticateToken } from '../middleware/auth';

/**
 * Plugin de rotas do carrinho
 */
export default async function cartRoutes(fastify: FastifyInstance) {
  // Todas as rotas do carrinho requerem autenticação
  fastify.addHook('preHandler', authenticateToken);

  // Esquemas de validação
  const addToCartSchema = {
    body: {
      type: 'object',
      required: ['product_id', 'quantity'],
      properties: {
        product_id: { type: 'string', format: 'uuid' },
        quantity: { type: 'integer', minimum: 1 }
      }
    }
  };

  const updateCartSchema = {
    params: {
      type: 'object',
      required: ['productId'],
      properties: {
        productId: { type: 'string', format: 'uuid' }
      }
    },
    body: {
      type: 'object',
      required: ['quantity'],
      properties: {
        quantity: { type: 'integer', minimum: 1 }
      }
    }
  };

  const removeFromCartSchema = {
    params: {
      type: 'object',
      required: ['productId'],
      properties: {
        productId: { type: 'string', format: 'uuid' }
      }
    }
  };

  // Rotas do carrinho
  fastify.get('/', getCartItems);
  fastify.post('/', { schema: addToCartSchema }, addToCart);
  fastify.put('/:productId', { schema: updateCartSchema }, updateCartItem);
  fastify.delete('/:productId', { schema: removeFromCartSchema }, removeFromCart);
  fastify.delete('/', clearCart);
}

