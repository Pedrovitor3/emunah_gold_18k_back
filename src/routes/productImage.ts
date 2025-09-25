/**
 * Rotas de imagens de produtos
 * Emunah Gold 18K - Backend
 */

import { FastifyInstance } from "fastify";
import {
  createProductImage,
  deleteProductImage,
  updateImageOrder,
} from "../controllers/productImageController";

/**
 * Plugin de rotas de imagens de produtos
 */
export default async function productImageRoutes(fastify: FastifyInstance) {
  const createProductImageSchema = {
    body: {
      type: "object",
      required: ["product_id", "image_url"],
      properties: {
        product_id: { type: "string", format: "uuid" },
        image_url: {
          type: "string",
          format: "uri",
          minLength: 1,
        },
        alt_text: { type: "string", maxLength: 255 },
        is_primary: { type: "boolean" },
        sort_order: { type: "integer", minimum: 0 },
      },
    },
  };

  const deleteProductImageSchema = {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
      },
    },
  };

  const updateImageOrderSchema = {
    params: {
      type: "object",
      required: ["productId"],
      properties: {
        productId: { type: "string", format: "uuid" },
      },
    },
    body: {
      type: "object",
      required: ["imageIds"],
      properties: {
        imageIds: {
          type: "array",
          items: { type: "string", format: "uuid" },
          minItems: 1,
        },
      },
    },
  };

  // Rotas administrativas (CRUD)
  fastify.post("/", { schema: createProductImageSchema }, createProductImage);
  fastify.delete(
    "/:id",
    { schema: deleteProductImageSchema },
    deleteProductImage
  );

  // Rota para reordenar imagens
  fastify.put(
    "/product/:productId/order",
    { schema: updateImageOrderSchema },
    updateImageOrder
  );
}
