/**
 * Rotas de categorias
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from 'fastify';
import { 
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getActiveCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController';

/**
 * Plugin de rotas de categorias
 */
export default async function categoryRoutes(fastify: FastifyInstance) {
  // Esquemas de validação
  const getCategoriesSchema = {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'string', pattern: '^[1-9][0-9]*$' },
        limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
        search: { type: 'string' },
        active: { type: 'string', enum: ['true', 'false', 'all'] }
      }
    }
  };

  const getCategoryByIdSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  };

  const getCategoryBySlugSchema = {
    params: {
      type: 'object',
      required: ['slug'],
      properties: {
        slug: { type: 'string', minLength: 1 }
      }
    }
  };

  const createCategorySchema = {
    body: {
      type: 'object',
      required: ['name', 'slug'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        slug: { 
          type: 'string', 
          minLength: 1, 
          maxLength: 100,
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' // Validação de slug
        },
        description: { type: 'string', maxLength: 500 },
        is_active: { type: 'boolean' }
      }
    }
  };

  const updateCategorySchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        slug: { 
          type: 'string', 
          minLength: 1, 
          maxLength: 100,
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' // Validação de slug
        },
        description: { type: 'string', maxLength: 500 },
        is_active: { type: 'boolean' }
      },
      minProperties: 1 // Pelo menos um campo deve ser fornecido
    }
  };

  const deleteCategorySchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  };

  // Rotas públicas de categorias
  fastify.get('/', { schema: getCategoriesSchema }, getCategories);
  fastify.get('/active', getActiveCategories);
  fastify.get('/slug/:slug', { schema: getCategoryBySlugSchema }, getCategoryBySlug);
  fastify.get('/:id', { schema: getCategoryByIdSchema }, getCategoryById);

  // Rotas administrativas (CRUD)
  fastify.post('/', { schema: createCategorySchema }, createCategory);
  fastify.put('/:id', { schema: updateCategorySchema }, updateCategory);
  fastify.delete('/:id', { schema: deleteCategorySchema }, deleteCategory);
}