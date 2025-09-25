/**
 * Rotas de produtos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from 'fastify';
import { 
  getProducts, 
  getProductById, 
  getCategories, 
  getFeaturedProducts, 
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController';

/**
 * Plugin de rotas de produtos
 */
export default async function productRoutes(fastify: FastifyInstance) {
  // Esquemas de validação
  const getProductsSchema = {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'string', pattern: '^[1-9][0-9]*$' },
        limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
        category: { type: 'string' },
        featured: { type: 'string', enum: ['true', 'false'] },
        search: { type: 'string' }
      }
    }
  };

  const getProductByIdSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  };

  const getFeaturedProductsSchema = {
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string', pattern: '^[1-9][0-9]*$' }
      }
    }
  };

// Schema para criação
const createProductSchema = {
  body: {
    type: 'object',
    required: ['category_id', 'name', 'sku', 'price'],
    properties: {
      category_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      sku: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      weight: { type: 'number', minimum: 0 },
      gold_purity: { type: 'string' },
      stock_quantity: { type: 'integer', minimum: 0 },
      is_active: { type: 'boolean' },
      featured: { type: 'boolean' }
    }
  }
};
const updateProductSchema = {

  body: {
    type: 'object',
    properties: {
      category_id: { type: 'string' },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string' },
      sku: { type: 'string', minLength: 1, maxLength: 100 },
      price: { type: 'number', minimum: 0 },
      weight: { type: 'number', minimum: 0 },
      gold_purity: { type: 'string' },
      stock_quantity: { type: 'number', minimum: 0 },
      is_active: { type: 'boolean' },
      featured: { type: 'boolean' }
    },
    additionalProperties: false
  }
};

// Rotas públicas de produtos
fastify.get('/', { schema: getProductsSchema }, getProducts);
fastify.get('/featured', { schema: getFeaturedProductsSchema }, getFeaturedProducts);
fastify.get('/categories', getCategories);
fastify.get('/:id', { schema: getProductByIdSchema }, getProductById);
// Rota POST
fastify.post('/', { schema: createProductSchema }, createProduct);
fastify.put('/:id', { schema: updateProductSchema }, updateProduct);
fastify.delete('/:id', deleteProduct);
}

