// src/config/aws-config.ts
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

// Interfaces para tipagem
interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

// Validação das variáveis de ambiente
const validateEnvVars = (): AWSConfig => {
  const region = process.env.AWS_REGION || process.env.REACT_APP_AWS_REGION;
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID || process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;
  const bucketName =
    process.env.AWS_BUCKET_NAME || process.env.REACT_APP_AWS_BUCKET_NAME;

  if (!region) {
    throw new Error(
      "REACT_APP_AWS_REGION não está definida nas variáveis de ambiente"
    );
  }

  if (!accessKeyId) {
    throw new Error(
      "REACT_APP_AWS_ACCESS_KEY_ID não está definida nas variáveis de ambiente"
    );
  }

  if (!secretAccessKey) {
    throw new Error(
      "REACT_APP_AWS_SECRET_ACCESS_KEY não está definida nas variáveis de ambiente"
    );
  }

  if (!bucketName) {
    throw new Error(
      "REACT_APP_AWS_BUCKET_NAME não está definida nas variáveis de ambiente"
    );
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
};

// Configuração validada
const awsConfig = validateEnvVars();

// Credenciais para o cliente S3
const credentials: AWSCredentials = {
  accessKeyId: awsConfig.accessKeyId,
  secretAccessKey: awsConfig.secretAccessKey,
};

// Configuração do cliente S3
const s3ClientConfig: S3ClientConfig = {
  region: awsConfig.region,
  credentials,
  // Configurações opcionais
  forcePathStyle: false, // Usar DNS virtual-hosted-style
  endpoint: undefined, // Use undefined para endpoint padrão da AWS
};

// Cliente S3
const s3Client = new S3Client(s3ClientConfig);

// Constantes exportadas
export const AWS_REGION = awsConfig.region;
export const BUCKET_NAME = awsConfig.bucketName;

// Cliente e configurações exportados
export { s3Client, awsConfig };

// Função utilitária para gerar URL pública
export const generatePublicUrl = (key: string): string => {
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};

// Função utilitária para validar se as configurações estão corretas
export const validateAWSConnection = async (): Promise<boolean> => {
  try {
    // Importar comando apenas quando necessário
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");

    const command = new HeadBucketCommand({
      Bucket: BUCKET_NAME,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Erro ao validar conexão com AWS S3:", error);
    return false;
  }
};

// Função para obter informações de configuração (sem credenciais sensíveis)
export const getConfigInfo = () => {
  return {
    region: AWS_REGION,
    bucketName: BUCKET_NAME,
    hasCredentials: !!(awsConfig.accessKeyId && awsConfig.secretAccessKey),
  };
};
