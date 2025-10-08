/**
 * Controller de pedidos
 * Emunah Gold 18K - Backend
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { AppDataSource } from "../config/database";
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Product } from "../models/Product";
import { CartItem } from "../models/CartItem";
import { Payment } from "../models/Payment";

/**
 * Interface para criar pedido
 */
interface CreateOrderData {
  payment_method: PaymentMethod;
  shipping_address: {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    estado: string;
    localidade: string;
    uf: string;
    ddd: string;
  };
  notes?: string;
}

/**
 * Interface para parâmetros de rota
 */
interface OrderParams {
  id: string;
}

/**
 * Interface para resposta da API
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Gera número único do pedido
 */
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `EMU${timestamp.slice(-6)}${random}`;
};

/**
 * Simula geração de código PIX
 */
const generatePixCode = (amount: number): { qrCode: string; code: string } => {
  const pixCode = `00020126580014br.gov.bcb.pix0136${Math.random()
    .toString(36)
    .substring(2, 15)}520400005303986540${amount.toFixed(
    2
  )}5802BR5913Emunah Gold 18K6009Sao Paulo62070503***6304`;
  return {
    qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`, // Placeholder
    code: pixCode,
  };
};

/**
 * Cria um novo pedido
 */
export const createOrder = async (
  request: FastifyRequest<{ Body: CreateOrderData }>,
  reply: FastifyReply
): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const userId = request.user?.userId;
    const { payment_method, shipping_address, notes } = request.body;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    // Repositórios
    const cartItemRepository = queryRunner.manager.getRepository(CartItem);
    const productRepository = queryRunner.manager.getRepository(Product);
    const orderRepository = queryRunner.manager.getRepository(Order);
    const orderItemRepository = queryRunner.manager.getRepository(OrderItem);
    const paymentRepository = queryRunner.manager.getRepository(Payment);

    // Buscar itens do carrinho
    const cartItems = await cartItemRepository.find({
      where: { user_id: userId },
      relations: ["product"],
    });

    if (cartItems.length === 0) {
      await queryRunner.rollbackTransaction();
      return reply.status(400).send({
        success: false,
        error: "Carrinho vazio",
      });
    }

    // Verificar estoque e calcular totais
    let subtotal = 0;
    for (const item of cartItems) {
      if (!item.product.is_active) {
        await queryRunner.rollbackTransaction();
        return reply.status(400).send({
          success: false,
          error: `Produto ${item.product.name} não está ativo`,
        });
      }

      if (item.product.stock_quantity < item.quantity) {
        await queryRunner.rollbackTransaction();
        return reply.status(400).send({
          success: false,
          error: `Produto ${item.product.name} não tem estoque suficiente`,
        });
      }

      subtotal += Number(item.product.price) * item.quantity;
    }

    const shippingCost = subtotal >= 500 ? 0 : 25; // Frete grátis acima de R$ 500
    const total = subtotal + shippingCost;

    // Criar pedido
    const orderNumber = generateOrderNumber();

    // Preparar dados do pedido
    const orderData: Partial<Order> = {
      user_id: userId,
      order_number: orderNumber,
      status: OrderStatus.PENDING,
      payment_method,
      payment_status: PaymentStatus.PENDING,
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_address,
    };

    // Adicionar notes apenas se existir
    if (notes) {
      orderData.notes = notes;
    }

    const newOrder = orderRepository.create(orderData);
    const savedOrder = (await queryRunner.manager.save(newOrder)) as Order;

    // Criar itens do pedido
    for (const item of cartItems) {
      const itemTotal = Number(item.product.price) * item.quantity;

      const orderItem = orderItemRepository.create({
        order_id: savedOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: Number(item.product.price),
        total_price: itemTotal,
      });

      await queryRunner.manager.save(orderItem);

      // Atualizar estoque
      item.product.stock_quantity -= item.quantity;
      await queryRunner.manager.save(item.product);
    }

    // Criar registro de pagamento
    let pixData = null;
    if (payment_method === PaymentMethod.PIX) {
      pixData = generatePixCode(total);
    }

    const expiresAt =
      payment_method === PaymentMethod.PIX
        ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutos para PIX
        : null;

    // Preparar dados do pagamento
    const paymentData: Partial<Payment> = {
      order_id: savedOrder.id,
      payment_method,
      amount: total,
      status: PaymentStatus.PENDING,
    };

    // Adicionar dados PIX apenas se existirem
    if (pixData) {
      paymentData.pix_qr_code = pixData.qrCode;
      paymentData.pix_code = pixData.code;
    }

    if (expiresAt) {
      paymentData.expires_at = expiresAt;
    }

    const payment = paymentRepository.create(paymentData);
    await queryRunner.manager.save(payment);

    // Limpar carrinho
    await queryRunner.manager.delete(CartItem, { user_id: userId });

    await queryRunner.commitTransaction();

    const response: ApiResponse<{
      orderId: string;
      orderNumber: string;
      total: number;
      pixData?: typeof pixData;
    }> = {
      success: true,
      data: {
        orderId: savedOrder.id,
        orderNumber,
        total,
        ...(pixData && { pixData }),
      },
      message: "Pedido criado com sucesso",
    };

    reply.status(201).send(response);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao criar pedido:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  } finally {
    await queryRunner.release();
  }
};

/**
 * Busca pedidos do usuário
 */
export const getUserOrders = async (
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

    const orderRepository = AppDataSource.getRepository(Order);

    const orders = await orderRepository.find({
      where: { user_id: userId },
      relations: ["items", "items.product"],
      order: { created_at: "DESC" },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      user_id: order.user_id,
      order_number: order.order_number,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      subtotal: Number(order.subtotal),
      shipping_cost: Number(order.shipping_cost),
      total: Number(order.total),
      shipping_address: order.shipping_address,
      tracking_code: order.tracking_code,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: order.items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        product_name: item.product?.name,
        product_sku: item.product?.sku,
      })),
    }));

    const response: ApiResponse<typeof formattedOrders> = {
      success: true,
      data: formattedOrders,
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Busca pedido por ID
 */
export const getOrderById = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const userId = request.user?.userId;
    const { id } = request.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const orderRepository = AppDataSource.getRepository(Order);

    const order = await orderRepository.findOne({
      where: { id, user_id: userId },
      relations: ["items", "items.product", "payments"],
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    const formattedOrder = {
      id: order.id,
      user_id: order.user_id,
      order_number: order.order_number,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      subtotal: Number(order.subtotal),
      shipping_cost: Number(order.shipping_cost),
      total: Number(order.total),
      shipping_address: order.shipping_address,
      tracking_code: order.tracking_code,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: order.items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        product_name: item.product?.name,
        product_sku: item.product?.sku,
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        payment_method: payment.payment_method,
        amount: Number(payment.amount),
        status: payment.status,
        pix_qr_code: payment.pix_qr_code,
        pix_code: payment.pix_code,
        expires_at: payment.expires_at,
        paid_at: payment.paid_at,
      })),
    };

    const response: ApiResponse<typeof formattedOrder> = {
      success: true,
      data: formattedOrder,
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Simula confirmação de pagamento (para testes)
 */
export const confirmPayment = async (
  request: FastifyRequest<{ Params: OrderParams }>,
  reply: FastifyReply
): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { id } = request.params;

    const orderRepository = queryRunner.manager.getRepository(Order);
    const paymentRepository = queryRunner.manager.getRepository(Payment);

    // Buscar o pedido
    const order = await orderRepository.findOne({ where: { id } });
    if (!order) {
      await queryRunner.rollbackTransaction();
      return reply.status(404).send({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    // Atualizar status do pagamento
    await paymentRepository.update(
      { order_id: id },
      {
        status: PaymentStatus.PAID,
        paid_at: new Date(),
      }
    );

    // Gerar código de rastreamento simulado
    const trackingCode = `BR${Math.random()
      .toString(36)
      .substring(2, 15)
      .toUpperCase()}`;

    // Atualizar status do pedido
    await orderRepository.update(
      { id },
      {
        status: OrderStatus.PAID,
        payment_status: PaymentStatus.PAID,
        tracking_code: trackingCode,
        updated_at: new Date(),
      }
    );

    await queryRunner.commitTransaction();

    const response: ApiResponse<{ trackingCode: string }> = {
      success: true,
      data: { trackingCode },
      message: "Pagamento confirmado com sucesso",
    };

    reply.send(response);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao confirmar pagamento:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  } finally {
    await queryRunner.release();
  }
};
