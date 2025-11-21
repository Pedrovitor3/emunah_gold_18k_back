import { FastifyRequest, FastifyReply } from "fastify";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import bcrypt from "bcryptjs";

interface CreateUserBody {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_admin?: boolean;
}

interface UpdateUserBody {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  is_admin?: boolean;
}

/**
 * GET /users
 * Retorna todos os usuários com suas relações
 */
export const getUsers = async (
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({
      relations: ["addresses", "cart_items", "orders"],
    });
    return reply.send({ success: true, data: users });
  } catch (error) {
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};

/**
 * GET /users/:id
 * Retorna um usuário específico com suas relações
 */
export const getUserById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: request.params.id },
      relations: ["addresses", "cart_items", "orders"],
    });
    if (!user)
      return reply
        .status(404)
        .send({ success: false, error: "Usuário não encontrado" });
    return reply.send({ success: true, data: user });
  } catch (error) {
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};

/**
 * POST /users
 * Cria um novo usuário
 */
export const createUser = async (
  request: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply
) => {
  try {
    const { email, password, first_name, last_name, phone, is_admin } =
      request.body;
    const userRepo = AppDataSource.getRepository(User);

    // Validação básica
    if (!email || !password || !first_name || !last_name) {
      return reply.status(400).send({
        success: false,
        error: "Email, senha, primeiro nome e último nome são obrigatórios",
      });
    }

    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser)
      return reply
        .status(400)
        .send({ success: false, error: "Email já cadastrado" });

    const password_hash = await bcrypt.hash(password, 10);

    const user = userRepo.create({
      email,
      password_hash,
      first_name,
      last_name,
      phone: phone || null,
      is_admin: is_admin || false,
    });

    await userRepo.save(user);

    return reply.status(201).send({
      success: true,
      data: user,
      message: "Usuário criado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};

/**
 * PUT /users/:id
 * Atualiza dados do usuário
 * Endereço é gerenciado por endpoints separados
 */
export const updateUser = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateUserBody;
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const body = request.body;

    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { id },
      relations: ["addresses", "cart_items", "orders"],
    });

    if (!user) {
      return reply
        .status(404)
        .send({ success: false, error: "Usuário não encontrado" });
    }

    // Atualiza apenas os campos fornecidos
    const updateData: Partial<User> = {};

    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.phone !== undefined) updateData.phone = body.phone;

    // is_admin só pode ser atualizado por admin
    if (body.is_admin !== undefined && request.user?.isAdmin) {
      updateData.is_admin = body.is_admin;
    }

    await userRepo.update(id, updateData);

    const updatedUser = await userRepo.findOne({
      where: { id },
      relations: ["addresses", "cart_items", "orders"],
    });

    return reply.send({
      success: true,
      data: updatedUser,
      message: "Usuário atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};

/**
 * DELETE /users/:id
 * Deleta um usuário
 */
export const deleteUser = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id } });
    if (!user)
      return reply
        .status(404)
        .send({ success: false, error: "Usuário não encontrado" });

    // Delete completo (ou poderia ser soft delete com deleted_at)
    await userRepo.delete(id);

    return reply.send({
      success: true,
      message: "Usuário deletado com sucesso",
      data: { id },
    });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};
