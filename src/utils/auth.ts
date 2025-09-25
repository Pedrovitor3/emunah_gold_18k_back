/**
 * Utilitários de autenticação
 * Emunah Gold 18K - Backend
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/types';

/**
 * Número de rounds para hash da senha
 */
const SALT_ROUNDS = 12;

/**
 * Secret para JWT (deve vir do .env em produção)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'emunah_gold_18k_super_secret_key';

/**
 * Tempo de expiração do token (24 horas)
 */
const JWT_EXPIRES_IN = '24h';

/**
 * Gera hash da senha
 * @param password - Senha em texto plano
 * @returns Hash da senha
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    throw new Error('Erro ao gerar hash da senha');
  }
};

/**
 * Verifica se a senha está correta
 * @param password - Senha em texto plano
 * @param hash - Hash armazenado no banco
 * @returns True se a senha estiver correta
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Erro ao verificar senha');
  }
};

/**
 * Gera token JWT
 * @param payload - Dados do usuário para incluir no token
 * @returns Token JWT
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    throw new Error('Erro ao gerar token');
  }
};

/**
 * Verifica e decodifica token JWT
 * @param token - Token JWT
 * @returns Payload decodificado
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
};

/**
 * Extrai token do header Authorization
 * @param authHeader - Header Authorization
 * @returns Token sem o prefixo "Bearer "
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer "
};

