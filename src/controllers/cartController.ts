/**
 * Controller do carrinho de compras
 * Emunah Gold 18K - Backend
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { AppDataSource } from "../config/database";
import { CartItem } from "../models/CartItem";
import { Product } from "../models/Product";

/**
 * Interface para adicionar item ao carrinho
 */
interface AddToCartData {
  product_id: string;
  quantity: number;
}

/**
 * Interface para atualizar quantidade
 */
interface UpdateCartData {
  quantity: number;
}

/**
 * Interface para parâmetros de rota
 */
interface CartParams {
  productId: string;
}

/**
 * Interface para resposta da API
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Busca itens do carrinho do usuário
 */
export const getCartItems = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const cartItemRepository = AppDataSource.getRepository(CartItem);

    const cartItems = await cartItemRepository.find({
      where: { user_id: userId },
      relations: ["product", "product.images"],
      order: { created_at: "DESC" },
    });

    // Filtrar apenas produtos ativos
    const activeCartItems = cartItems.filter((item) => item.product.is_active);

    const formattedCartItems = activeCartItems.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: item.created_at,
      updated_at: item.updated_at,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        price: Number(item.product.price),
        sku: item.product.sku,
        weight: item.product.weight ? Number(item.product.weight) : null,
        gold_purity: item.product.gold_purity,
        stock_quantity: item.product.stock_quantity,
        images: item.product.images || [],
      },
    }));

    const response: ApiResponse<typeof formattedCartItems> = {
      success: true,
      data: formattedCartItems,
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar carrinho:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Adiciona item ao carrinho
 */
export const addToCart = async (
  request: FastifyRequest<{ Body: AddToCartData }>,
  reply: FastifyReply
): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const userId = request.user?.userId;
    const { product_id, quantity } = request.body;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!product_id || !quantity || quantity <= 0) {
      return reply.status(400).send({
        success: false,
        error: "Produto e quantidade são obrigatórios",
      });
    }

    const productRepository = queryRunner.manager.getRepository(Product);
    const cartItemRepository = queryRunner.manager.getRepository(CartItem);

    // Verificar se o produto existe e está ativo
    const product = await productRepository.findOne({
      where: { id: product_id, is_active: true },
    });

    if (!product) {
      await queryRunner.rollbackTransaction();
      return reply.status(404).send({
        success: false,
        error: "Produto não encontrado",
      });
    }

    if (product.stock_quantity < quantity) {
      await queryRunner.rollbackTransaction();
      return reply.status(400).send({
        success: false,
        error: "Quantidade solicitada não disponível em estoque",
      });
    }

    // Verificar se o item já existe no carrinho
    const existingItem = await cartItemRepository.findOne({
      where: { user_id: userId, product_id },
    });

    if (existingItem) {
      // Atualizar quantidade do item existente
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock_quantity < newQuantity) {
        await queryRunner.rollbackTransaction();
        return reply.status(400).send({
          success: false,
          error: "Quantidade total solicitada não disponível em estoque",
        });
      }

      existingItem.quantity = newQuantity;
      existingItem.updated_at = new Date();
      await queryRunner.manager.save(existingItem);
    } else {
      // Inserir novo item no carrinho
      const cartItemData: Partial<CartItem> = {
        user_id: userId,
        product_id,
        quantity,
      };

      const newCartItem = cartItemRepository.create(cartItemData);
      await queryRunner.manager.save(newCartItem);
    }

    await queryRunner.commitTransaction();

    const response: ApiResponse = {
      success: true,
      message: "Item adicionado ao carrinho com sucesso",
    };

    reply.send(response);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao adicionar ao carrinho:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  } finally {
    await queryRunner.release();
  }
};

/**
 * Atualiza quantidade de um item no carrinho
 */
export const updateCartItem = async (
  request: FastifyRequest<{ Params: CartParams; Body: UpdateCartData }>,
  reply: FastifyReply
): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const userId = request.user?.userId;
    const { productId } = request.params;
    const { quantity } = request.body;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!quantity || quantity <= 0) {
      return reply.status(400).send({
        success: false,
        error: "Quantidade deve ser maior que zero",
      });
    }

    const cartItemRepository = queryRunner.manager.getRepository(CartItem);
    const productRepository = queryRunner.manager.getRepository(Product);

    // Verificar se o item existe no carrinho do usuário
    const cartItem = await cartItemRepository.findOne({
      where: { user_id: userId, product_id: productId },
    });

    if (!cartItem) {
      await queryRunner.rollbackTransaction();
      return reply.status(404).send({
        success: false,
        error: "Item não encontrado no carrinho",
      });
    }

    // Verificar estoque disponível
    const product = await productRepository.findOne({
      where: { id: productId, is_active: true },
    });

    if (!product) {
      await queryRunner.rollbackTransaction();
      return reply.status(404).send({
        success: false,
        error: "Produto não encontrado",
      });
    }

    if (product.stock_quantity < quantity) {
      await queryRunner.rollbackTransaction();
      return reply.status(400).send({
        success: false,
        error: "Quantidade solicitada não disponível em estoque",
      });
    }

    // Atualizar quantidade
    cartItem.quantity = quantity;
    cartItem.updated_at = new Date();
    await queryRunner.manager.save(cartItem);

    await queryRunner.commitTransaction();

    const response: ApiResponse = {
      success: true,
      message: "Quantidade atualizada com sucesso",
    };

    reply.send(response);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao atualizar carrinho:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  } finally {
    await queryRunner.release();
  }
};

/**
 * Remove item do carrinho
 */
export const removeFromCart = async (
  request: FastifyRequest<{ Params: CartParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const userId = request.user?.userId;
    const { productId } = request.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const cartItemRepository = AppDataSource.getRepository(CartItem);

    // Remover item do carrinho
    const result = await cartItemRepository.delete({
      user_id: userId,
      product_id: productId,
    });

    if (result.affected === 0) {
      return reply.status(404).send({
        success: false,
        error: "Item não encontrado no carrinho",
      });
    }

    const response: ApiResponse = {
      success: true,
      message: "Item removido do carrinho com sucesso",
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao remover do carrinho:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Limpa todo o carrinho do usuário
 */
export const clearCart = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const cartItemRepository = AppDataSource.getRepository(CartItem);

    await cartItemRepository.delete({ user_id: userId });

    const response: ApiResponse = {
      success: true,
      message: "Carrinho limpo com sucesso",
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao limpar carrinho:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};
