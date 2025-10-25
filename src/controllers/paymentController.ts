import { FastifyRequest, FastifyReply } from "fastify";
import { QrCodePix } from "qrcode-pix";

export async function createPixPayment(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { value, description } = req.body as {
      value: number;
      description?: string;
    };

    if (!value || value <= 0) {
      return reply.status(400).send({
        error: "O campo 'value' é obrigatório e deve ser maior que zero.",
      });
    }

    // Transaction ID deve ter no máximo 25 caracteres
    const timestamp = Date.now().toString();
    const transactionId = `TX${timestamp}`.slice(0, 25);

    const qrCodePix = QrCodePix({
      version: "01",
      key: "+5562998130462", // Chave com +55 para telefone
      name: "PEDRO VITOR DA SILVA", // Nome completo, sem acentos
      city: "GOIANIA", // Sem acento
      message: description || "Pagamento", // Mensagem sem caracteres especiais
      value: Number(value.toFixed(2)), // Garantir 2 casas decimais
      transactionId: transactionId,
    });

    const pixCode = qrCodePix.payload();
    const qrCode = await qrCodePix.base64();

    console.log("=== PIX GERADO ===");
    console.log("Transaction ID:", transactionId);
    console.log("Valor:", value);
    console.log("PIX Code:", pixCode);
    console.log("==================");

    return reply.send({
      success: true,
      pixCode,
      qrCode,
      transactionId,
      value: Number(value.toFixed(2)),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Erro ao gerar QR Code Pix:", error);
    return reply.status(500).send({
      error: "Erro ao gerar QR Code Pix",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

//TODO tirar o await
export async function generatePix(value: number, description: string) {
  try {
    // Transaction ID deve ter no máximo 25 caracteres
    const timestamp = Date.now().toString();
    const transactionId = `TX${timestamp}`.slice(0, 25);

    const qrCodePix = QrCodePix({
      version: "01",
      key: "+5562998130462", // Chave com +55 para telefone
      name: "Pedro Vitor Gouveia do Carmo", // Nome completo, sem acentos
      city: "Goiania", // Sem acento
      message: description || "Pagamento", // Mensagem sem caracteres especiais
      value: Number(value.toFixed(2)), // Garantir 2 casas decimais
      transactionId: transactionId,
    });

    const pixCode = qrCodePix.payload();
    const qrCode = await qrCodePix.base64();

    return {
      pixCode,
      qrCode,
      transactionId,
      value: Number(value.toFixed(2)),
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
