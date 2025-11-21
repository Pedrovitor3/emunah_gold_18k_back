import { FastifyInstance } from "fastify";
import {
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController";
import { authenticateToken } from "../middleware/auth";

export default async function addressRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticateToken);

  // GET /addresses - Retorna o endereço do usuário autenticado
  fastify.get("/", getAddress);

  // POST /addresses - Cria um novo endereço
  fastify.post("/", createAddress);

  // PUT /addresses/:id - Atualiza um endereço
  fastify.put("/:id", updateAddress);

  // DELETE /addresses/:id - Deleta um endereço
  fastify.delete("/:id", deleteAddress);
}
