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
import { generatePix } from "./paymentController";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
  shipping_cost: number;
  notes?: string;
}

interface PaymentResponse {
  orderId: string;
  orderNumber: string;
  total: number;
  payment_method: string;
  pix?: {
    pixCode: string;
    qrCode: string;
    transactionId: string;
    expiresAt: string;
  };
  stripe?: {
    clientSecret: string;
    paymentIntentId: string;
  };
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
    const { payment_method, shipping_cost, shipping_address, notes } =
      request.body;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    // Repositórios
    const cartItemRepository = queryRunner.manager.getRepository(CartItem);
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

      subtotal += Number(item.product.price) * item.quantity;
    }

    const total = subtotal + shipping_cost;

    // Criar pedido
    const orderNumber = generateOrderNumber();

    const orderData: Partial<Order> = {
      user_id: userId,
      order_number: orderNumber,
      status: OrderStatus.PENDING,
      payment_method,
      payment_status: PaymentStatus.PENDING,
      subtotal,
      shipping_cost,
      total,
      shipping_address,
    };

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

      item.product.stock_quantity -= item.quantity;
      await queryRunner.manager.save(item.product);
    }

    // ===== PROCESSAR PAGAMENTO - PADRONIZADO =====
    let pixData = null;
    let stripeData = null;

    const paymentData: Partial<Payment> = {
      order_id: savedOrder.id,
      payment_method,
      amount: total,
      status: PaymentStatus.PENDING,
    };

    // PIX - Gerar QR Code
    if (payment_method === PaymentMethod.PIX) {
      const infoPix = await generatePix(total, "Emunah");
      pixData = infoPix;
      paymentData.pix_qr_code = infoPix.qrCode ?? "";
      paymentData.pix_code = infoPix.pixCode ?? "";
    }

    // STRIPE - Criar PaymentIntent
    if (payment_method === PaymentMethod.CREDIT_CARD) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: "brl",
        description: `Pedido #${orderNumber}`,
        metadata: {
          orderId: savedOrder.id,
        },
      });
      stripeData = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
      paymentData.payment_provider = paymentIntent.id;
    }

    const payment = paymentRepository.create(paymentData);
    await queryRunner.manager.save(payment);

    // Limpar carrinho
    await queryRunner.manager.delete(CartItem, { user_id: userId });

    await queryRunner.commitTransaction();

    // ===== RESPOSTA PADRONIZADA PARA AMBOS OS MÉTODOS =====\

    const response: ApiResponse<PaymentResponse> = {
      success: true,
      data: {
        orderId: savedOrder.id,
        orderNumber,
        total,
        payment_method,
        ...(pixData && {
          pixData,
        }),
        ...(stripeData && {
          stripe: {
            clientSecret: stripeData.clientSecret,
            paymentIntentId: stripeData.paymentIntentId,
          },
        }),
      },
      message: "Pedido criado com sucesso",
    };

    reply.status(201).send(response);
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao criar pedido:", error?.message || error);
    console.error(error?.stack);
    reply.status(500).send({
      success: false,
      error: error?.message || "Erro interno do servidor",
    });
  } finally {
    await queryRunner.release();
  }
};

interface UpdateOrderData {
  payment_method?: PaymentMethod;
  notes?: string;
}

export const updateOrder = async (
  request: FastifyRequest<{
    Params: { orderId: string };
    Body: UpdateOrderData;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const userId = request.user?.userId;
    const { orderId } = request.params;
    const { payment_method, notes } = request.body;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const orderRepository = queryRunner.manager.getRepository(Order);
    const paymentRepository = queryRunner.manager.getRepository(Payment);

    // Buscar pedido
    const order = await orderRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ["items"],
    });

    if (!order) {
      await queryRunner.rollbackTransaction();
      return reply.status(404).send({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    // ✅ Só permite atualizar se pendente
    if (order.payment_status !== PaymentStatus.PENDING) {
      await queryRunner.rollbackTransaction();
      return reply.status(400).send({
        success: false,
        error: "Apenas pedidos pendentes podem ser atualizados",
      });
    }

    // Atualizar método de pagamento
    if (payment_method) {
      order.payment_method = payment_method;

      // Buscar pagamento relacionado
      const payment = await paymentRepository.findOne({
        where: { order_id: orderId },
      });

      if (payment) {
        payment.payment_method = payment_method;

        // ✅ SE FOR PIX - GERAR NOVO QR CODE
        if (payment_method === PaymentMethod.PIX) {
          const infoPix = await generatePix(order.total, "Emunah");
          payment.pix_qr_code = infoPix.qrCode ?? "";
          payment.pix_code = infoPix.pixCode ?? "";
        } else {
          // SE FOR CARTÃO - LIMPAR DADOS PIX
          payment.pix_qr_code = "";
          payment.pix_code = "";
        }

        await queryRunner.manager.save(payment);
      }
    }

    // Atualizar notas
    if (notes !== undefined) {
      order.notes = notes;
    }

    await queryRunner.manager.save(order);

    await queryRunner.commitTransaction();

    // ✅ RETORNAR DADOS PARA PAGAR
    let paymentData: any = {
      orderId: order.id,
      payment_method: order.payment_method,
      total: order.total,
    };

    // Se PIX - retornar QR Code
    if (order.payment_method === PaymentMethod.PIX) {
      const payment = await paymentRepository.findOne({
        where: { order_id: orderId },
      });

      paymentData.pix = {
        pixCode: payment?.pix_code,
        qrCode: payment?.pix_qr_code,
        transactionId: payment?.id || orderId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }

    // Se Cartão - retornar client secret
    if (order.payment_method === PaymentMethod.CREDIT_CARD) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100),
        currency: "brl",
        description: `Pedido #${order.id}`,
        metadata: {
          orderId: order.id,
        },
      });

      paymentData.stripe = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    }

    reply.send({
      success: true,
      data: paymentData,
      message: "Pedido atualizado com sucesso",
    });
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.error("Erro ao atualizar pedido:", error);
    reply.status(500).send({
      success: false,
      error: error?.message || "Erro interno do servidor",
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
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        // ✅ ADICIONAR objeto product completo
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              description: item.product.description,
              price: Number(item.product.price),
              image_urls: item.product.image_urls,
              stock_quantity: item.product.stock_quantity,
              category: item.product.category,
              weight: item.product.weight,
              is_active: item.product.is_active,
            }
          : null,
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
