import { FastifyRequest, FastifyReply } from "fastify";
import { QrCodePix } from "qrcode-pix";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//TODO tirar o await
export async function generatePix(value: number | string, description: string) {
  try {
    const numericValue = Number(value);

    if (isNaN(numericValue)) {
      throw new Error("Valor inválido no generatePix");
    }
    // Transaction ID deve ter no máximo 25 caracteres
    const timestamp = Date.now().toString();
    const transactionId = `TX${timestamp}`.slice(0, 25);

    const qrCodePix = QrCodePix({
      version: "01",
      key: "+5562998130462", // Chave com +55 para telefone
      name: "Pedro Vitor Gouveia do Carmo", // Nome completo, sem acentos
      city: "Goiania", // Sem acento
      message: description || "Pagamento", // Mensagem sem caracteres especiais
      value: Number(numericValue.toFixed(2)), // Garantir 2 casas decimais
      transactionId: transactionId,
    });

    const pixCode = qrCodePix.payload();
    const qrCode = await qrCodePix.base64();

    return {
      pixCode,
      qrCode,
      transactionId,
      value: Number(numericValue.toFixed(2)),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Erro ao gerar QR Code Pix:", error);
    return {
      error: "Erro ao gerar QR Code Pix",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

type StripeCheckoutRequest = {
  amount: number;
  email: string;
  name: string;
  orderId: string;
};

export const createCheckoutSession = async (
  request: FastifyRequest<{ Body: StripeCheckoutRequest }>,
  reply: FastifyReply
) => {
  const { amount, email, name, orderId } = request.body;

  try {
    // Validar variável de ambiente
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL environment variable is not configured");
    }

    // Garantir que a URL tem o protocolo
    const baseUrl = frontendUrl;
    // Converter para centavos
    const amountInCents = Math.round(1 * 100);

    // Criar Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Pedido #${orderId}`,
              description: `Pagamento do pedido ${orderId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,
      customer_email: email,
      metadata: {
        orderId: orderId,
        customerName: name,
      },
    });

    reply.send({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (err: any) {
    console.error("Error creating checkout session:", err);

    let message = "An error occurred while creating checkout session.";

    if (err.type === "StripeInvalidRequestError") {
      message = err.message;
    } else if (err.type === "StripeCardError") {
      message = err.message;
    } else if (err.code) {
      message = err.message;
    }

    reply.status(400).send({
      success: false,
      error: message,
    });
  }
};

export const createPaymentIntent = async (
  request: FastifyRequest<{
    Body: {
      amount: number;
      currency?: string;
      email?: string;
      name?: string;
      orderId?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { amount, currency = "brl", email, name, orderId } = request.body;

    if (!amount || Number.isNaN(Number(amount))) {
      return reply
        .status(400)
        .send({ success: false, error: "Invalid amount" });
    }

    const amountInCents = Math.round(Number(amount) * 100); // atenção: dígito a dígito
    if (amountInCents <= 0) {
      return reply
        .status(400)
        .send({ success: false, error: "Amount must be > 0" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      receipt_email: email,
      description: `Pedido #${orderId ?? "unknown"}`,
      metadata: {
        orderId: orderId ?? "",
        customerName: name ?? "",
      },
    });

    return reply.send({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    console.error("createPaymentIntent error", err);
    return reply
      .status(500)
      .send({ success: false, error: err.message ?? "Server error" });
  }
};

// Nova rota para verificar o status do pagamento
export const verifyCheckoutSession = async (
  request: FastifyRequest<{ Querystring: { session_id: string } }>,
  reply: FastifyReply
) => {
  const { session_id } = request.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    reply.send({
      success: true,
      data: {
        status: session.payment_status,
        paymentIntentId: session.payment_intent,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
      },
    });
  } catch (err: any) {
    console.error("Error verifying session:", err);
    reply.status(400).send({
      success: false,
      error: err.message,
    });
  }
};
