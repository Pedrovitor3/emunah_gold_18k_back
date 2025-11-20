import { FastifyInstance } from "fastify";
import {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsers,
} from "../controllers/userController";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/", getUsers);
  fastify.get("/:id", getUserById);
  fastify.post("/", createUser);
  fastify.put("/:id", updateUser);
  fastify.delete("/:id", deleteUser);
}
