import { AppDataSource } from "../config/database";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { FastifyReply, FastifyRequest } from "fastify";
import { PaginatedResponse } from "../models/types";
import {
  generateUniqueFileName,
  uploadToS3,
  validateFile,
} from "./uploadController";
import type { MultipartFile } from "@fastify/multipart";

interface ProductSearchParams {
  page?: string;
  limit?: string;
  category?: string;
  featured?: string;
  search?: string;
}

export const getProducts = async (
  request: FastifyRequest<{ Querystring: ProductSearchParams }>,
  reply: FastifyReply
) => {
  try {
    const {
      page = "1",
      limit = "12",
      category,
      featured,
      search,
    } = request.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const productRepo = AppDataSource.getRepository(Product);

    const queryBuilder = productRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "c")
      .where("p.is_active = :active", { active: true });

    if (featured === "true") {
      queryBuilder.andWhere("p.featured = :featured", { featured: true });
    }

    if (search) {
      queryBuilder.andWhere(
        "(p.name ILIKE :search OR p.description ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [products, total] = await queryBuilder
      .orderBy("p.featured", "DESC")
      .addOrderBy("p.created_at", "DESC")
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<Product> = {
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const getProductById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);

    const product = await productRepo.findOne({
      where: { id: request.params.id, is_active: true },
      relations: ["category"],
    });

    if (!product) {
      return reply
        .status(404)
        .send({ success: false, error: "Produto não encontrado" });
    }

    reply.send({ success: true, data: product });
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const getCategories = async (
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);

    const categories = await categoryRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.products", "p", "p.is_active = true")
      .where("c.is_active = true")
      .loadRelationCountAndMap("c.product_count", "c.products", "prod", (qb) =>
        qb.andWhere("prod.is_active = true")
      )
      .orderBy("c.name", "ASC")
      .getMany();

    reply.send({ success: true, data: categories });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const getFeaturedProducts = async (
  request: FastifyRequest<{ Querystring: { limit?: string } }>,
  reply: FastifyReply
) => {
  try {
    const { limit = "6" } = request.query;
    const limitNum = parseInt(limit);

    const productRepo = AppDataSource.getRepository(Product);

    const products = await productRepo.find({
      where: { is_active: true, featured: true },
      relations: ["category"],
      order: { created_at: "DESC" },
      take: limitNum,
    });

    reply.send({ success: true, data: products });
  } catch (error) {
    console.error("Erro ao buscar produtos em destaque:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

// ========================================
// UTILITÁRIO: PROCESSAR UM ARQUIVO
// ========================================

const processFileUpload = async (file: MultipartFile): Promise<string> => {
  validateFile(file);
  const buffer = await file.toBuffer();
  const filename = generateUniqueFileName(file.filename, "products");
  const result = await uploadToS3(
    buffer,
    filename,
    file.mimetype,
    file.filename
  );
  return result.url;
};

// ========================================
// CRIAR PRODUTO
// ========================================

export async function createProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const productRepo = AppDataSource.getRepository(Product);

    const fields: Record<string, any> = {};
    const imageUrls: string[] = [];

    console.log("🔵 Iniciando criação de produto...");

    // Processar multipart
    let fileCount = 0;
    let fieldCount = 0;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        fileCount++;
        // É um arquivo - type guard do TypeScript
        const file = part as MultipartFile;
        console.log(`📸 Arquivo ${fileCount} recebido:`, {
          fieldname: file.fieldname,
          filename: file.filename,
          mimetype: file.mimetype,
        });

        try {
          const url = await processFileUpload(file);
          imageUrls.push(url);
          console.log(`✅ Upload ${fileCount} concluído:`, url);
        } catch (err: any) {
          console.error(`❌ Erro ao fazer upload de ${file.filename}:`, err);
          return reply.status(400).send({
            success: false,
            error: `Erro no upload de ${file.filename}: ${err.message}`,
          });
        }
      } else {
        fieldCount++;
        // É um campo de formulário
        fields[part.fieldname] = part.value;
        console.log(`📝 Campo ${fieldCount}:`, part.fieldname, "=", part.value);
      }
    }

    console.log(`📊 Resumo: ${fileCount} arquivo(s), ${fieldCount} campo(s)`);
    console.log("🖼️  URLs das imagens:", imageUrls);

    // Validar campos obrigatórios
    if (!fields.name || !fields.price || !fields.category_id) {
      return reply.status(400).send({
        success: false,
        error: "Campos obrigatórios: name, price, category_id",
      });
    }

    // Criar produto
    const product = productRepo.create({
      category: { id: fields.category_id },
      name: fields.name,
      description: fields.description || "",
      price: Number(fields.price),
      weight: fields.weight ? Number(fields.weight) : 0,
      gold_purity: fields.gold_purity || "",
      stock_quantity: fields.stock_quantity ? Number(fields.stock_quantity) : 0,
      is_active:
        fields.is_active !== undefined ? fields.is_active === "true" : true,
      featured:
        fields.featured !== undefined ? fields.featured === "true" : false,
      image_urls: imageUrls,
    });

    await productRepo.save(product);

    console.log(`✅ Produto criado: ${product.id} - ${product.name}`);

    return reply.status(201).send({ success: true, data: product });
  } catch (error: any) {
    console.error("❌ Erro ao criar produto:", error);
    return reply.status(500).send({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}

// ========================================
// ATUALIZAR PRODUTO
// ========================================

export async function updateProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params as { id: string };
    const productRepo = AppDataSource.getRepository(Product);

    console.log(`🔵 Atualizando produto ${id}...`);

    // Buscar produto existente
    const existingProduct = await productRepo.findOne({ where: { id } });
    if (!existingProduct) {
      return reply
        .status(404)
        .send({ success: false, error: "Produto não encontrado" });
    }

    console.log("✅ Produto encontrado:", existingProduct.name);

    const fields: Record<string, any> = {};
    const newImageUrls: string[] = [];

    // Robust multipart parsing: só iteramos se for multipart; caso contrário lemos body
    if (request.isMultipart && request.isMultipart()) {
      console.log("📦 Processando multipart data...");
      let fileCount = 0;
      let fieldCount = 0;

      for await (const part of request.parts()) {
        if (part.type === "file") {
          fileCount++;
          const file = part as MultipartFile;
          console.log(`📸 Novo arquivo ${fileCount}:`, {
            fieldname: file.fieldname,
            filename: file.filename,
            mimetype: file.mimetype,
          });

          try {
            const url = await processFileUpload(file);
            newImageUrls.push(url);
            console.log(`✅ Upload ${fileCount} concluído:`, url);
          } catch (err: any) {
            console.error(`❌ Erro ao fazer upload de ${file.filename}:`, err);
            return reply.status(400).send({
              success: false,
              error: `Erro no upload: ${err?.message || String(err)}`,
            });
          }
        } else {
          fieldCount++;
          // part.value é string
          fields[part.fieldname] = part.value;
          console.log(
            `📝 Campo ${fieldCount}:`,
            part.fieldname,
            "=",
            part.value
          );
        }
      }

      console.log(
        `📊 Resumo multipart: ${fileCount} arquivo(s), ${fieldCount} campo(s)`
      );
    } else {
      // Não é multipart — tentar ler como JSON/body
      console.log("🔁 Não multipart — lendo request.body");
      Object.assign(fields, (request.body as any) || {});
    }

    console.log("🔎 Campos recebidos:", fields);
    console.log("🖼️  Novas imagens recebidas:", newImageUrls);

    // Construir updateData com conversões
    const updateData: Partial<Product> = {};

    if (fields.name !== undefined) updateData.name = String(fields.name);
    if (fields.description !== undefined)
      updateData.description = String(fields.description);
    if (fields.price !== undefined) updateData.price = Number(fields.price);
    if (fields.weight !== undefined) updateData.weight = Number(fields.weight);
    if (fields.gold_purity !== undefined)
      updateData.gold_purity = String(fields.gold_purity);
    if (fields.stock_quantity !== undefined)
      updateData.stock_quantity = Number(fields.stock_quantity);
    if (fields.is_active !== undefined)
      updateData.is_active =
        fields.is_active === "true" || fields.is_active === true;
    if (fields.featured !== undefined)
      updateData.featured =
        fields.featured === "true" || fields.featured === true;

    // Categoria — se você usa uma relação, envie { id: ... }
    if (fields.category_id !== undefined && fields.category_id !== null) {
      updateData.category = { id: String(fields.category_id) } as any;
    }

    // Gerenciar imagens: juntar existentes + novas
    if (newImageUrls.length > 0) {
      updateData.image_urls = [
        ...(existingProduct.image_urls || []),
        ...newImageUrls,
      ];
    }

    console.log("🛠️  Dados para atualizar:", updateData);

    // Usar update (não sobrescreve campos não informados) ou save após merge — preferível update para segurança
    await productRepo.update(id, updateData);

    // Buscar produto atualizado para retornar
    const updatedProduct = await productRepo.findOne({ where: { id } });

    console.log(`✅ Produto atualizado: ${id}`);

    return reply.status(200).send({ success: true, data: updatedProduct });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar produto:", error);
    return reply.status(500).send({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}

// ========================================
// DELETAR PRODUTO (SOFT DELETE)
// ========================================

export async function deleteProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params as { id: string };
    const productRepo = AppDataSource.getRepository(Product);

    // Verificar se o produto existe
    const product = await productRepo.findOne({ where: { id } });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: "Produto não encontrado",
      });
    }

    // Soft delete
    await productRepo.update(id, { is_active: false });

    console.log(`✅ Produto desativado: ${id}`);

    return reply.status(200).send({
      success: true,
      message: "Produto desativado com sucesso",
      data: { id },
    });
  } catch (error: any) {
    console.error("❌ Erro ao desativar produto:", error);
    return reply.status(500).send({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}
