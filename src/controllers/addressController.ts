import { FastifyRequest, FastifyReply } from "fastify";
import { AppDataSource } from "../config/database";
import { Address } from "../models/Address";
import { User } from "../models/User";

interface CreateAddressBody {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
}

interface UpdateAddressBody {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

/**
 * GET /addresses
 * Retorna o endereço do usuário autenticado
 * Como há apenas 1 endereço por usuário, retorna o único
 */
export const getAddress = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const addressRepo = AppDataSource.getRepository(Address);

    const address = await addressRepo.findOne({
      where: { user_id: userId },
    });

    if (!address) {
      return reply.status(404).send({
        success: false,
        error: "Nenhum endereço cadastrado",
      });
    }

    return reply.send({ success: true, data: address });
  } catch (error) {
    console.error("Erro ao buscar endereço:", error);
    return reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * POST /addresses
 * Cria um novo endereço para o usuário autenticado
 * Valida se já existe endereço (limite de 1)
 */
export const createAddress = async (
  request: FastifyRequest<{ Body: CreateAddressBody }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const { cep, logradouro, numero, complemento, bairro, localidade, uf } =
      request.body;

    // Validação básica
    if (!cep || !logradouro || !numero || !bairro || !localidade || !uf) {
      return reply.status(400).send({
        success: false,
        error: "CEP, rua, número, bairro, cidade e estado são obrigatórios",
      });
    }

    const addressRepo = AppDataSource.getRepository(Address);

    // Verifica se o usuário já tem um endereço
    const existingAddress = await addressRepo.findOne({
      where: { user_id: userId },
    });

    if (existingAddress) {
      return reply.status(400).send({
        success: false,
        error: "Usuário já possui um endereço cadastrado",
      });
    }

    // Verifica se o usuário existe
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    // Cria o novo endereço
    const address = addressRepo.create({
      user_id: userId,
      cep,
      logradouro,
      numero,
      complemento: complemento || "",
      bairro,
      localidade,
      uf,
      is_default: true,
    });

    await addressRepo.save(address);

    return reply.status(201).send({
      success: true,
      data: address,
      message: "Endereço criado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao criar endereço:", error);
    return reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * PUT /addresses/:id
 * Atualiza o endereço do usuário
 * Valida se o endereço pertence ao usuário autenticado
 */
export const updateAddress = async (
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateAddressBody;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.userId;
    const { id } = request.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const addressRepo = AppDataSource.getRepository(Address);

    // Verifica se o endereço existe e pertence ao usuário
    const address = await addressRepo.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return reply.status(404).send({
        success: false,
        error: "Endereço não encontrado",
      });
    }

    // Atualiza apenas os campos fornecidos
    const updateData: Partial<Address> = {};

    if (request.body.cep !== undefined) updateData.cep = request.body.cep;
    if (request.body.logradouro !== undefined)
      updateData.logradouro = request.body.logradouro;
    if (request.body.numero !== undefined)
      updateData.numero = request.body.numero;
    if (request.body.complemento !== undefined)
      updateData.complemento = request.body.complemento;
    if (request.body.bairro !== undefined)
      updateData.bairro = request.body.bairro;
    if (request.body.localidade !== undefined)
      updateData.localidade = request.body.localidade;
    if (request.body.uf !== undefined) updateData.uf = request.body.uf;

    await addressRepo.update(id, updateData);

    const updatedAddress = await addressRepo.findOne({ where: { id } });

    return reply.send({
      success: true,
      data: updatedAddress,
      message: "Endereço atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar endereço:", error);
    return reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * DELETE /addresses/:id
 * Deleta o endereço do usuário
 * Valida se o endereço pertence ao usuário autenticado
 */
export const deleteAddress = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.userId;
    const { id } = request.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const addressRepo = AppDataSource.getRepository(Address);

    // Verifica se o endereço existe e pertence ao usuário
    const address = await addressRepo.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return reply.status(404).send({
        success: false,
        error: "Endereço não encontrado",
      });
    }

    // Deleta o endereço
    await addressRepo.delete(id);

    return reply.send({
      success: true,
      message: "Endereço deletado com sucesso",
      data: { id },
    });
  } catch (error) {
    console.error("Erro ao deletar endereço:", error);
    return reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
};
