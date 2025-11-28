import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const databaseURL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.vjeqtzjgsehrdiavqpvc:3mun4H2026.@aws-1-us-east-2.pooler.supabase.com:5432/postgres";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseURL,
  ssl: { rejectUnauthorized: false },
  synchronize: false, // mantenha false em produção
  logging: false,
  entities: [`${__dirname}/../models/**/*.{ts,js}`],
  migrations: [`${__dirname}/../migrations/**/*.{ts,js}`],
  subscribers: [],
});

/**
 * Função para inicializar a conexão
 */
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log(
        "✅ Conexão com o banco de dados (TypeORM) estabelecida com sucesso"
      );
    } else {
      console.log("🔹 Banco de dados já estava inicializado");
    }
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco de dados:", error);
    return false;
  }
};
