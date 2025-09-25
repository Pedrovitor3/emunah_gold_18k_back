/**
 * Rotas de rastreamento
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from 'fastify';
import { getTrackingInfo, getOrderTracking } from '../controllers/trackingController';
import { optionalAuth, authenticateToken } from '../middleware/auth';

/**
 * Interface para parâmetros de rastreamento
 */
interface TrackingParams {
  trackingCode: string;
}

/**
 * Plugin de rotas de rastreamento
 */
export default async function trackingRoutes(fastify: FastifyInstance) {
  // Esquemas de validação
  const getTrackingInfoSchema = {
    params: {
      type: 'object',
      required: ['trackingCode'],
      properties: {
        trackingCode: { 
          type: 'string', 
          minLength: 10,
          maxLength: 20
        }
      }
    }
  };

  const getOrderTrackingSchema = {
    params: {
      type: 'object',
      required: ['orderId'],
      properties: {
        orderId: { type: 'string', format: 'uuid' }
      }
    }
  };

  // Rota pública para rastreamento por código
  fastify.get<{ Params: TrackingParams }>(
    '/:trackingCode', 
    { 
      schema: getTrackingInfoSchema,
      preHandler: optionalAuth 
    }, 
    getTrackingInfo
  );

  // Rota protegida para rastreamento de pedido do usuário
  fastify.get<{ Params: { orderId: string } }>(
    '/order/:orderId',
    {
      schema: getOrderTrackingSchema,
      preHandler: authenticateToken
    },
    getOrderTracking
  );
}

