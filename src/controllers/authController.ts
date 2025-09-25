import { FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { CreateUserData, LoginData, ApiResponse } from '../models/types';

export const register = async (
  request: FastifyRequest<{ Body: CreateUserData }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email, password, first_name, last_name, phone } = request.body;

    if (!email || !password || !first_name || !last_name) {
      return reply.status(400).send({
        success: false,
        error: 'Email, senha, nome e sobrenome são obrigatórios'
      });
    }

    const userRepo = AppDataSource.getRepository(User);

    const existingUser = await userRepo.findOne({ where: { email } });

    if (existingUser) {
      return reply.status(409).send({
        success: false,
        error: 'Email já está em uso'
      });
    }

    const passwordHash = await hashPassword(password);

  const user = userRepo.create({
    email,
    password_hash: passwordHash,
    first_name,
    last_name,
    phone: phone ?? null,  // evita undefined
    is_admin: false,
  });

    await userRepo.save(user);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    });

    // Remover password_hash da resposta
    const { password_hash, ...userWithoutPassword } = user;

    const response: ApiResponse<{ user: typeof userWithoutPassword; token: string }> = {
      success: true,
      data: { user: userWithoutPassword, token },
      message: 'Usuário registrado com sucesso'
    };

    return reply.status(201).send(response);

  } catch (error) {
    console.error('Erro no registro:', error);
    return reply.status(500).send({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

export const login = async (
  request: FastifyRequest<{ Body: LoginData }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return reply.status(401).send({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    });

    const { password_hash, ...userWithoutPassword } = user;

    const response: ApiResponse<{ user: typeof userWithoutPassword; token: string }> = {
      success: true,
      data: { user: userWithoutPassword, token },
      message: 'Login realizado com sucesso'
    };

    reply.send(response);

  } catch (error) {
    console.error('Erro no login:', error);
    return reply.status(500).send({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

export const getProfile = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'first_name', 'last_name', 'phone', 'is_admin', 'created_at', 'updated_at']
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user
    };

    reply.send(response);

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return reply.status(500).send({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
