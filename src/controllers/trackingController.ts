import { FastifyRequest, FastifyReply } from "fastify";
import { AppDataSource } from "../config/database";
import { Order } from "../models/Order";
import { OrderTracking } from "../models/OrderTracking";

/**
 * Interface para parâmetros de rastreamento
 */
interface TrackingParams {
  trackingCode: string;
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
 * Interface para evento de rastreamento
 */
interface TrackingEvent {
  id: string;
  order_id: string;
  status: string;
  description: string;
  location: string;
  occurred_at: Date;
  created_at: Date;
}

/**
 * Simula eventos de rastreamento
 */
const generateTrackingEvents = (
  orderDate: Date,
  orderId: string
): TrackingEvent[] => {
  const events: Omit<TrackingEvent, "id" | "created_at">[] = [
    {
      order_id: orderId,
      status: "Pedido Confirmado",
      description:
        "Seu pedido foi confirmado e está sendo preparado para envio.",
      location: "São Paulo/SP",
      occurred_at: orderDate,
    },
    {
      order_id: orderId,
      status: "Em Preparação",
      description:
        "Seu pedido está sendo preparado em nosso centro de distribuição.",
      location: "São Paulo/SP",
      occurred_at: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000), // +2 horas
    },
    {
      order_id: orderId,
      status: "Enviado",
      description: "Seu pedido foi enviado e está a caminho do destino.",
      location: "São Paulo/SP",
      occurred_at: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000), // +1 dia
    },
    {
      order_id: orderId,
      status: "Em Trânsito",
      description: "Objeto em trânsito para o centro de distribuição.",
      location: "Centro de Distribuição",
      occurred_at: new Date(orderDate.getTime() + 48 * 60 * 60 * 1000), // +2 dias
    },
    {
      order_id: orderId,
      status: "Saiu para Entrega",
      description: "Objeto saiu para entrega ao destinatário.",
      location: "Agência Local",
      occurred_at: new Date(orderDate.getTime() + 72 * 60 * 60 * 1000), // +3 dias
    },
  ];

  // Retorna apenas eventos que já ocorreram (baseado na data atual)
  const now = new Date();
  return events
    .filter((event) => event.occurred_at <= now)
    .map((event, index) => ({
      id: `tracking_${index}`,
      ...event,
      created_at: event.occurred_at,
    }));
};

/**
 * Busca informações de rastreamento por código
 */
export const getTrackingInfo = async (
  request: FastifyRequest<{ Params: TrackingParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { trackingCode } = request.params;

    if (!trackingCode) {
      return reply.status(400).send({
        success: false,
        error: "Código de rastreamento é obrigatório",
      });
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const orderTrackingRepository = AppDataSource.getRepository(OrderTracking);

    // Buscar pedido pelo código de rastreamento
    const order = await orderRepository.findOne({
      where: { tracking_code: trackingCode },
      relations: ["user"],
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: "Código de rastreamento não encontrado",
      });
    }

    // Buscar eventos de rastreamento salvos no banco
    const savedTrackingEvents = await orderTrackingRepository.find({
      where: { order_id: order.id },
      order: { occurred_at: "ASC" },
    });

    // Usar eventos do banco se existirem, senão usar simulados
    const events =
      savedTrackingEvents.length > 0
        ? savedTrackingEvents.map((event) => ({
            id: event.id,
            order_id: event.order_id,
            status: event.status,
            description: event.description || "",
            location: event.location || "",
            occurred_at: event.occurred_at,
            created_at: event.created_at,
          }))
        : generateTrackingEvents(order.created_at, order.id);

    const trackingInfo = {
      order_number: order.order_number,
      tracking_code: order.tracking_code,
      status: order.status,
      recipient: `${order.user.first_name} ${order.user.last_name}`,
      shipping_address: order.shipping_address,
      events,
    };

    const response: ApiResponse<typeof trackingInfo> = {
      success: true,
      data: trackingInfo,
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar rastreamento:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Busca rastreamento de pedido do usuário autenticado
 */
export const getOrderTracking = async (
  request: FastifyRequest<{ Params: { orderId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const userId = request.user?.userId;
    const { orderId } = request.params;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const orderTrackingRepository = AppDataSource.getRepository(OrderTracking);

    // Verificar se o pedido pertence ao usuário
    const order = await orderRepository.findOne({
      where: { id: orderId, user_id: userId },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    if (!order.tracking_code) {
      return reply.status(400).send({
        success: false,
        error: "Pedido ainda não possui código de rastreamento",
      });
    }

    // Buscar eventos de rastreamento salvos no banco
    const savedTrackingEvents = await orderTrackingRepository.find({
      where: { order_id: order.id },
      order: { occurred_at: "ASC" },
    });

    // Usar eventos do banco se existirem, senão usar simulados
    const events =
      savedTrackingEvents.length > 0
        ? savedTrackingEvents.map((event) => ({
            id: event.id,
            order_id: event.order_id,
            status: event.status,
            description: event.description || "",
            location: event.location || "",
            occurred_at: event.occurred_at,
            created_at: event.created_at,
          }))
        : generateTrackingEvents(order.created_at, order.id);

    const trackingInfo = {
      order_id: order.id,
      order_number: order.order_number,
      tracking_code: order.tracking_code,
      status: order.status,
      shipping_address: order.shipping_address,
      events,
    };

    const response: ApiResponse<typeof trackingInfo> = {
      success: true,
      data: trackingInfo,
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar rastreamento do pedido:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Adiciona evento de rastreamento ao pedido (para uso administrativo)
 */
export const addTrackingEvent = async (
  request: FastifyRequest<{
    Params: { orderId: string };
    Body: {
      status: string;
      description?: string;
      location?: string;
      occurred_at?: Date;
    };
  }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { orderId } = request.params;
    const { status, description, location, occurred_at } = request.body;

    if (!status) {
      return reply.status(400).send({
        success: false,
        error: "Status é obrigatório",
      });
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const orderTrackingRepository = AppDataSource.getRepository(OrderTracking);

    // Verificar se o pedido existe
    const order = await orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    // Criar evento de rastreamento
    const trackingEventData: Partial<OrderTracking> = {
      order_id: orderId,
      status,
      occurred_at: occurred_at ? new Date(occurred_at) : new Date(),
    };

    if (description) {
      trackingEventData.description = description;
    }

    if (location) {
      trackingEventData.location = location;
    }

    const trackingEvent = orderTrackingRepository.create(trackingEventData);
    const savedEvent = await orderTrackingRepository.save(trackingEvent);

    const response: ApiResponse<OrderTracking> = {
      success: true,
      data: savedEvent,
      message: "Evento de rastreamento adicionado com sucesso",
    };

    reply.status(201).send(response);
  } catch (error) {
    console.error("Erro ao adicionar evento de rastreamento:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

/**
 * Lista todos os eventos de rastreamento de um pedido (para uso administrativo)
 */
export const getOrderTrackingEvents = async (
  request: FastifyRequest<{ Params: { orderId: string } }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { orderId } = request.params;

    const orderRepository = AppDataSource.getRepository(Order);
    const orderTrackingRepository = AppDataSource.getRepository(OrderTracking);

    // Verificar se o pedido existe
    const order = await orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    // Buscar todos os eventos de rastreamento
    const trackingEvents = await orderTrackingRepository.find({
      where: { order_id: orderId },
      order: { occurred_at: "ASC" },
    });

    const response: ApiResponse<OrderTracking[]> = {
      success: true,
      data: trackingEvents,
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar eventos de rastreamento:", error);
    reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};
