import createApp from "./app";
import { initializeDatabase } from "./config/database";

/**
 * Inicia o servidor
 */
const start = async (): Promise<void> => {
  try {
    // Criar aplicação
    const app = await createApp();

    // Configurações do servidor
    const host = process.env.HOST || "0.0.0.0";
    const port = parseInt(process.env.PORT || "3001");

    // Testar conexão com o banco de dados
    console.log("🔍 Testando conexão com o banco de dados...");
    const dbConnected = await initializeDatabase();

    if (!dbConnected) {
      console.error("❌ Falha na conexão com o banco de dados");
      process.exit(1);
    }

    // Iniciar servidor
    console.log(`🚀 Iniciando servidor em ${host}:${port}...`);

    await app.listen({ port });

    console.log(`✅ Servidor rodando em http://${host}:${port}`);
    console.log(`📊 Health check disponível em http://${host}:${port}/health`);
    console.log(`📚 API disponível em http://${host}:${port}/api`);
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
};

// Manipuladores de sinal para encerramento gracioso
process.on("SIGINT", () => {
  console.log("\n🛑 Recebido SIGINT, encerrando servidor...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Recebido SIGTERM, encerrando servidor...");
  process.exit(0);
});

// Iniciar servidor
start();
