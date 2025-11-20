import { type FastifyReply, type FastifyRequest } from "fastify";
import axios from "axios";

// Rota para autenticar nos Correios
export const CorreioAutenticContact = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const username = "60926586000141";
    const password = "BHuFhTkMO0hZte7wvJC9M9ToBe09ji0IwRAQGUDR";
    const contratoNumero = "9912722012";

    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

    const response = await axios.post(
      "https://api.correios.com.br/token/v1/autentica/contrato",
      { numero: contratoNumero },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    return reply.send(response.data);
  } catch (error: any) {
    console.error("Erro ao autenticar nos Correios:", error.message || error);
    return reply
      .status(500)
      .send({ error: "Falha ao autenticar nos Correios" });
  }
};

// Função auxiliar para autenticar
const authenticateCorreios = async (): Promise<string> => {
  const username = "60926586000141";
  const password = "BHuFhTkMO0hZte7wvJC9M9ToBe09ji0IwRAQGUDR";
  const contratoNumero = "9912722012";

  const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

  const response = await axios.post(
    "https://api.correios.com.br/token/v1/autentica/contrato",
    { numero: contratoNumero },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );

  return response.data.token;
};

export const CorreioCalcularFreteContact = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const {
      cepDestino,
      peso,
      comprimento = 20,
      largura = 20,
      altura = 20,
      valorDeclarado = 10,
    } = request.body as {
      cepDestino: string;
      peso: number; // normalmente em kg
      comprimento?: number;
      largura?: number;
      altura?: number;
      valorDeclarado?: number;
    };

    const token = await authenticateCorreios();

    // 🔹 Limpa e valida o CEP
    const cepLimpo = cepDestino.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      return reply.status(400).send({ error: "CEP de destino inválido" });
    }

    // 🔹 Converte peso para gramas se for em kg
    const pesoGramas = peso < 30 ? peso * 1000 : peso; // se vier em kg, multiplica
    const valorSeguro = valorDeclarado > 0 ? valorDeclarado : 30;

    // 🔹 Monta payload exatamente como a API dos Correios espera
    const requestData = {
      idLote: "1",
      parametrosProduto: [
        {
          coProduto: "04162",
          nuRequisicao: "1",
          cepOrigem: process.env.CEP_ORIGEM_CORREIOS || "74423160",
          psObjeto: String(Math.round(pesoGramas)),
          tpObjeto: "2",
          comprimento: String(comprimento),
          largura: String(largura),
          altura: String(altura),
          servicosAdicionais: [
            { coServAdicional: "019" },
            { coServAdicional: "001" },
          ],
          vlDeclarado: valorSeguro, // ✅ corrigido
          dtEvento: new Date().toLocaleDateString("pt-BR"),
          cepDestino: cepLimpo,
        },
      ],
    };

    // 🔹 Chama a API
    const response = await axios.post(
      "https://api.correios.com.br/preco/v1/nacional",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return reply.send(response.data);
  } catch (error: any) {
    console.error("Erro ao calcular frete dos Correios:");

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      console.error("⚠️ Detalhes do erro Correios:", {
        status,
        data,
        url: error.config?.url,
      });

      // Retorna detalhes úteis ao front
      return reply.status(status || 500).send({
        error:
          data?.message ||
          data?.mensagem ||
          data?.error ||
          "Erro ao calcular frete nos Correios",
        details: data,
      });
    }

    console.error(error);
    return reply
      .status(500)
      .send({ error: "Falha ao calcular frete dos Correios" });
  }
};
