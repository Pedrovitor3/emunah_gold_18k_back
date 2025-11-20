import { FastifyRequest, FastifyReply } from "fastify";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import { Address } from "../models/Address";

interface CreateUserBody {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  photo?: string;
  is_admin?: boolean;
}

interface UpdateUserBody {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  photo?: string | null;
  is_admin?: boolean;
}

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

export const createUser = async (
  request: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply
) => {
  try {
    const { email, password, first_name, last_name, phone, photo, is_admin } =
      request.body;
    const userRepo = AppDataSource.getRepository(User);

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
      // photo: photo || null,
      is_admin: is_admin || false,
    });

    await userRepo.save(user);
    return reply.status(201).send({ success: true, data: user });
  } catch (error) {
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};

export const updateUser = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateUserBody & { address?: any };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { address, ...body } = request.body;

    const userRepo = AppDataSource.getRepository(User);
    const addressRepo = AppDataSource.getRepository(Address);

    const user = await userRepo.findOne({
      where: { id },
      relations: ["addresses"],
    });

    if (!user) {
      return reply
        .status(404)
        .send({ success: false, error: "Usuário não encontrado" });
    }

    // Atualiza dados básicos do usuário
    await userRepo.update(id, {
      first_name: body.first_name ?? user.first_name,
      last_name: body.last_name ?? user.last_name,
      phone: body.phone ?? user.phone,
      is_admin: body.is_admin ?? user.is_admin,
    });

    // Se veio endereço no formato da API de CEP
    if (address) {
      const formattedAddress = {
        street: address.logradouro,
        number: address.number ?? "",
        complement: address.complemento ?? "",
        neighborhood: address.bairro,
        city: address.localidade,
        state: address.uf,
        zip_code: address.cep,
        is_default: true,
        user_id: id,
      };

      const existingAddress = user.addresses?.[0];
      if (existingAddress) {
        await addressRepo.update(existingAddress.id, formattedAddress);
      } else {
        const newAddress = addressRepo.create(formattedAddress);
        await addressRepo.save(newAddress);
      }
    }

    const updatedUser = await userRepo.findOne({
      where: { id },
      relations: ["addresses", "cart_items", "orders"],
    });

    return reply.send({ success: true, data: updatedUser });
  } catch (error) {
    console.error(error);
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};

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

    // Marcar como inativo em vez de excluir
    await userRepo.update(id, {
      is_admin: false /* opcional: deleted_at: new Date() */,
    });

    return reply.send({
      success: true,
      message: "Usuário desativado com sucesso",
      data: { id },
    });
  } catch (error) {
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
};
