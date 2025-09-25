/**
 * Configuração da conexão com o banco de dados PostgreSQL usando TypeORM
 * Emunah Gold 18K - Backend
 */
import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "emunah_user",
  password: process.env.DB_PASSWORD || "3mun4h",
  database: process.env.DB_NAME || "emunah_gold_18k",
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
