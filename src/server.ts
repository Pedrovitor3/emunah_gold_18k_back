import createApp from "./app";
import { initializeDatabase } from "./config/database";

/**
 * Inicia o servidor
 */
const start = async (): Promise<void> => {
  try {
    const app = await createApp();

    const port = parseInt(process.env.PORT || "3001");

    console.log("🔍 Testando conexão com o banco de dados...");
    const dbConnected = await initializeDatabase();

    if (!dbConnected) {
      console.error("❌ Falha na conexão com o banco de dados");
      process.exit(1);
    }

    console.log(`🚀 Iniciando servidor na porta ${port}...`);

    await app.listen({ port }); // sem host

    console.log(`✅ Servidor rodando na porta ${port}`);
    console.log(`📊 Health check disponível em /health`);
    console.log(`📚 API disponível em /api`);
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
