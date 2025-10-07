import { AppDataSource } from "../config/database";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { FastifyReply, FastifyRequest } from "fastify";
import { PaginatedResponse } from "../models/types";

interface ProductSearchParams {
  page?: string;
  limit?: string;
  category?: string;
  featured?: string;
  search?: string;
}
interface DeleteProductParams {
  id: string;
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
      .leftJoinAndSelect("p.images", "pi")
      .where("p.is_active = :active", { active: true });

    if (category) {
      queryBuilder.andWhere("c.slug = :category", { category });
    }

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
      relations: ["category", "images"],
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
      relations: ["category", "images"],
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

interface CreateProductBody {
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  weight?: number;
  gold_purity?: string;
  stock_quantity?: number;
  is_active?: boolean;
  featured?: boolean;
}

export async function createProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = request.body as CreateProductBody;
  try {
    const productRepo = AppDataSource.getRepository(Product);

    // Criar instância do produto
    const product = productRepo.create({
      category: { id: body.category_id },
      name: body.name,
      description: body.description ?? "",
      sku: body.sku,
      price: body.price,
      weight: body.weight ?? 0,
      gold_purity: body.gold_purity ?? "",
      stock_quantity: body.stock_quantity ?? 0,
      is_active: body.is_active ?? true,
      featured: body.featured ?? false,
    });

    await productRepo.save(product);

    return reply.status(201).send({ success: true, data: product });
  } catch (error) {
    return reply
      .status(500)
      .send({ success: false, error: (error as Error).message });
  }
}

export async function updateProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { id } = request.params as { id: string };
    const body = request.body as CreateProductBody;
    const productRepo = AppDataSource.getRepository(Product);
    // Verificar se o produto existe
    const existingProduct = await productRepo.findOne({
      where: { id: id },
    });

    if (!existingProduct) {
      return reply.status(404).send({
        success: false,
        error: "Product not found",
      });
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (body.category_id !== undefined) {
      updateData.category = { id: body.category_id };
    }
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.sku !== undefined) {
      updateData.sku = body.sku;
    }
    if (body.price !== undefined) {
      updateData.price = body.price;
    }
    if (body.weight !== undefined) {
      updateData.weight = body.weight;
    }
    if (body.gold_purity !== undefined) {
      updateData.gold_purity = body.gold_purity;
    }
    if (body.stock_quantity !== undefined) {
      updateData.stock_quantity = body.stock_quantity;
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }
    if (body.featured !== undefined) {
      updateData.featured = body.featured;
    }

    // Atualizar produto
    await productRepo.update(id, updateData);

    // Buscar produto atualizado
    const updatedProduct = await productRepo.findOne({
      where: { id: id },
      relations: ["category"], // Incluir categoria se necessário
    });

    return reply.status(200).send({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

export async function deleteProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  try {
    const productRepo = AppDataSource.getRepository(Product);

    // Verificar se o produto existe
    const product = await productRepo.findOne({
      where: { id: id },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: "Produto não encontrado",
      });
    }

    // Marcar como inativo ao invés de excluir
    await productRepo.update(id, {
      is_active: false,
      // Opcional: adicionar campos de auditoria
      // deleted_at: new Date()
    });

    return reply.status(200).send({
      success: true,
      message: "Produto desativado com sucesso",
      data: { id: id },
    });
  } catch (error) {
    console.error("Erro ao desativar produto:", error);
    return reply.status(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}
