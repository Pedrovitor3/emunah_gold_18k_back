// /**
//  * Script para testar conexão com AWS S3
//  * Emunah Gold 18K - Teste de Conectividade
//  */

// import {
//   S3Client,
//   HeadBucketCommand,
//   ListObjectsV2Command,
//   PutObjectCommand,
// } from "@aws-sdk/client-s3";
// import dotenv from "dotenv";

// // Carregar variáveis de ambiente
// dotenv.config();

// // Configuração do S3 Client
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || "eu-north-1",
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// const BUCKET_NAME = process.env.BUCKET_NAME || "emunah-gold-bucket";

// // Cores para console
// const colors = {
//   green: "\x1b[32m",
//   red: "\x1b[31m",
//   yellow: "\x1b[33m",
//   blue: "\x1b[34m",
//   reset: "\x1b[0m",
//   bold: "\x1b[1m",
// };

// const log = {
//   success: (msg: string) =>
//     console.log(`${colors.green}✅ ${msg}${colors.reset}`),
//   error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
//   warning: (msg: string) =>
//     console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
//   info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
//   title: (msg: string) =>
//     console.log(`\n${colors.bold}${colors.blue}=== ${msg} ===${colors.reset}`),
// };

// // Teste 1: Verificar variáveis de ambiente
// async function testEnvironmentVariables() {
//   log.title("TESTE 1: Verificando Variáveis de Ambiente");

//   const requiredVars = [
//     "AWS_REGION",
//     "AWS_ACCESS_KEY_ID",
//     "AWS_SECRET_ACCESS_KEY",
//     "BUCKET_NAME",
//   ];

//   let allPresent = true;

//   for (const varName of requiredVars) {
//     const value = process.env[varName];
//     if (value) {
//       // Mascarar credenciais sensíveis
//       if (varName.includes("SECRET") || varName.includes("KEY")) {
//         const masked =
//           value.substring(0, 4) +
//           "*".repeat(value.length - 8) +
//           value.substring(value.length - 4);
//         log.success(`${varName}: ${masked}`);
//       } else {
//         log.success(`${varName}: ${value}`);
//       }
//     } else {
//       log.error(`${varName}: Não encontrada`);
//       allPresent = false;
//     }
//   }

//   return allPresent;
// }

// // Teste 2: Verificar conectividade AWS
// async function testAWSConnectivity() {
//   log.title("TESTE 2: Verificando Conectividade AWS");

//   try {
//     const startTime = Date.now();

//     // Comando simples para testar conectividade
//     const command = new HeadBucketCommand({
//       Bucket: BUCKET_NAME,
//     });

//     await s3Client.send(command);

//     const responseTime = Date.now() - startTime;
//     log.success(`Conectividade AWS OK (${responseTime}ms)`);
//     log.info(`Região: ${process.env.AWS_REGION}`);
//     log.info(`Bucket: ${BUCKET_NAME}`);

//     return true;
//   } catch (error: any) {
//     log.error(`Falha na conectividade: ${error.message}`);

//     // Análise detalhada do erro
//     if (error.name === "NoSuchBucket") {
//       log.error("O bucket especificado não existe");
//     } else if (error.name === "InvalidAccessKeyId") {
//       log.error("Access Key ID inválida");
//     } else if (error.name === "SignatureDoesNotMatch") {
//       log.error("Secret Access Key incorreta");
//     } else if (error.name === "AccessDenied") {
//       log.error("Acesso negado - verifique as permissões IAM");
//     } else if (error.code === "ENOTFOUND") {
//       log.error("Erro de DNS - verifique a conexão com a internet");
//     }

//     return false;
//   }
// }

// // Teste 3: Listar objetos do bucket
// async function testBucketAccess() {
//   log.title("TESTE 3: Testando Acesso ao Bucket");

//   try {
//     const command = new ListObjectsV2Command({
//       Bucket: BUCKET_NAME,
//       MaxKeys: 5,
//     });

//     const response = await s3Client.send(command);

//     log.success("Acesso ao bucket OK");
//     log.info(`Objetos encontrados: ${response.KeyCount || 0}`);

//     if (response.Contents && response.Contents.length > 0) {
//       log.info("Primeiros arquivos:");
//       response.Contents.slice(0, 3).forEach((obj) => {
//         log.info(`  - ${obj.Key} (${obj.Size} bytes)`);
//       });
//     }

//     return true;
//   } catch (error: any) {
//     log.error(`Erro ao acessar bucket: ${error.message}`);
//     return false;
//   }
// }

// // Teste 4: Teste de upload (arquivo pequeno)
// async function testUpload() {
//   log.title("TESTE 4: Testando Upload");

//   try {
//     const testContent = "Teste de conectividade AWS S3 - Emunah Gold";
//     const testKey = `test/connectivity-test-${Date.now()}.txt`;

//     const command = new PutObjectCommand({
//       Bucket: BUCKET_NAME,
//       Key: testKey,
//       Body: Buffer.from(testContent),
//       ContentType: "text/plain",
//       Metadata: {
//         purpose: "connectivity-test",
//         timestamp: new Date().toISOString(),
//       },
//     });

//     await s3Client.send(command);

//     const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;

//     log.success("Upload de teste OK");
//     log.info(`Arquivo criado: ${testKey}`);
//     log.info(`URL: ${fileUrl}`);

//     return true;
//   } catch (error: any) {
//     log.error(`Erro no upload de teste: ${error.message}`);
//     return false;
//   }
// }

// // Teste 5: Verificar permissões
// async function testPermissions() {
//   log.title("TESTE 5: Verificando Permissões");

//   const permissions = [];

//   // Testar ListObjects
//   try {
//     await s3Client.send(
//       new ListObjectsV2Command({ Bucket: BUCKET_NAME, MaxKeys: 1 })
//     );
//     permissions.push("✅ LIST - OK");
//   } catch (error) {
//     permissions.push("❌ LIST - Falhou");
//   }

//   // Testar PutObject
//   try {
//     const testKey = `permissions-test/test-${Date.now()}.txt`;
//     await s3Client.send(
//       new PutObjectCommand({
//         Bucket: BUCKET_NAME,
//         Key: testKey,
//         Body: "test",
//       })
//     );
//     permissions.push("✅ PUT - OK");
//   } catch (error) {
//     permissions.push("❌ PUT - Falhou");
//   }

//   permissions.forEach((perm) => console.log(`  ${perm}`));

//   return (
//     permissions.filter((p) => p.includes("✅")).length === permissions.length
//   );
// }

// // Função principal
// async function runTests() {
//   console.log(`${colors.bold}${colors.blue}`);
//   console.log("╔══════════════════════════════════════════════╗");
//   console.log("║        TESTE DE CONECTIVIDADE AWS S3         ║");
//   console.log("║            Emunah Gold 18K                   ║");
//   console.log("╚══════════════════════════════════════════════╝");
//   console.log(colors.reset);

//   const results = [];

//   try {
//     // Executar todos os testes
//     results.push({
//       name: "Variáveis de Ambiente",
//       success: await testEnvironmentVariables(),
//     });
//     results.push({
//       name: "Conectividade AWS",
//       success: await testAWSConnectivity(),
//     });
//     results.push({
//       name: "Acesso ao Bucket",
//       success: await testBucketAccess(),
//     });
//     results.push({ name: "Teste de Upload", success: await testUpload() });
//     results.push({
//       name: "Verificação de Permissões",
//       success: await testPermissions(),
//     });
//   } catch (error) {
//     log.error(`Erro geral nos testes: ${error}`);
//   }

//   // Relatório final
//   log.title("RELATÓRIO FINAL");

//   const totalTests = results.length;
//   const passedTests = results.filter((r) => r.success).length;

//   results.forEach((result) => {
//     if (result.success) {
//       log.success(`${result.name}: PASSOU`);
//     } else {
//       log.error(`${result.name}: FALHOU`);
//     }
//   });

//   console.log(`\n${colors.bold}`);
//   if (passedTests === totalTests) {
//     log.success(`TODOS OS TESTES PASSARAM! (${passedTests}/${totalTests})`);
//     log.success("Sua configuração AWS está funcionando corretamente! 🎉");
//   } else {
//     log.warning(`${passedTests}/${totalTests} testes passaram`);
//     log.warning("Verifique as configurações para os testes que falharam");
//   }
//   console.log(colors.reset);
// }

// // Executar testes se chamado diretamente
// if (require.main === module) {
//   runTests().catch(console.error);
// }

// export {
//   runTests,
//   testEnvironmentVariables,
//   testAWSConnectivity,
//   testBucketAccess,
//   testUpload,
// };
