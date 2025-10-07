import { AppDataSource } from "../config/database";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { FastifyReply, FastifyRequest } from "fastify";
import { PaginatedResponse } from "../models/types";

interface CategorySearchParams {
  page?: string;
  limit?: string;
  search?: string;
  active?: string;
}

export const getCategories = async (
  request: FastifyRequest<{ Querystring: CategorySearchParams }>,
  reply: FastifyReply
) => {
  try {
    const { page = "1", limit = "12", search, active } = request.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const categoryRepo = AppDataSource.getRepository(Category);

    const queryBuilder = categoryRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.products", "p", "p.is_active = true")
      .loadRelationCountAndMap("c.product_count", "c.products", "prod", (qb) =>
        qb.andWhere("prod.is_active = true")
      );

    // Filtro de status ativo (padrão: apenas categorias ativas)
    if (active === "false") {
      queryBuilder.where("c.is_active = :active", { active: false });
    } else if (active === "all") {
      // Não adiciona filtro de ativo
    } else {
      queryBuilder.where("c.is_active = :active", { active: true });
    }

    if (search) {
      queryBuilder.andWhere(
        "(c.name ILIKE :search OR c.description ILIKE :search)",
        {
          search: `%${search}%`,
        }
      );
    }

    const [categories, total] = await queryBuilder
      .orderBy("c.name", "ASC")
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limitNum);

    const response: PaginatedResponse<Category> = {
      success: true,
      data: categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };

    reply.send(response);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const getCategoryById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);

    const category = await categoryRepo.findOne({
      where: { id: request.params.id, is_active: true },
      relations: ["products"],
      loadRelationIds: false,
    });

    if (!category) {
      return reply
        .status(404)
        .send({ success: false, error: "Categoria não encontrada" });
    }

    // Contar produtos ativos da categoria
    const productRepo = AppDataSource.getRepository(Product);
    const productCount = await productRepo.count({
      where: { category: { id: category.id }, is_active: true },
    });

    const categoryWithCount = {
      ...category,
      product_count: productCount,
    };

    reply.send({ success: true, data: categoryWithCount });
  } catch (error) {
    console.error("Erro ao buscar categoria:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const getCategoryBySlug = async (
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);

    const category = await categoryRepo.findOne({
      where: { slug: request.params.slug, is_active: true },
      relations: ["products"],
      loadRelationIds: false,
    });

    if (!category) {
      return reply
        .status(404)
        .send({ success: false, error: "Categoria não encontrada" });
    }

    // Contar produtos ativos da categoria
    const productRepo = AppDataSource.getRepository(Product);
    const productCount = await productRepo.count({
      where: { category: { id: category.id }, is_active: true },
    });

    const categoryWithCount = {
      ...category,
      product_count: productCount,
    };

    reply.send({ success: true, data: categoryWithCount });
  } catch (error) {
    console.error("Erro ao buscar categoria por slug:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const getActiveCategories = async (
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
    console.error("Erro ao buscar categorias ativas:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

interface CreateCategoryBody {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}

export const createCategory = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const body = request.body as CreateCategoryBody;

    const categoryRepo = AppDataSource.getRepository(Category);

    // Verificar se já existe categoria com o mesmo slug
    const existingCategory = await categoryRepo.findOne({
      where: { slug: body.slug },
    });

    if (existingCategory) {
      return reply.status(409).send({
        success: false,
        error: "Já existe uma categoria com este slug",
      });
    }

    // Criar instância da categoria
    const category = categoryRepo.create({
      name: body.name,
      slug: body.slug,
      description: body.description ?? "",
      is_active: body.is_active ?? true,
    });

    await categoryRepo.save(category);

    return reply.status(201).send({ success: true, data: category });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

interface UpdateCategoryBody {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export const updateCategory = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const body = request.body as CreateCategoryBody;
    const categoryRepo = AppDataSource.getRepository(Category);

    const category = await categoryRepo.findOne({
      where: { id: id },
    });

    if (!category) {
      return reply
        .status(404)
        .send({ success: false, error: "Categoria não encontrada" });
    }

    // Verificar se o slug já existe (apenas se está sendo alterado)
    if (body.slug && body.slug !== category.slug) {
      const existingCategory = await categoryRepo.findOne({
        where: { slug: body.slug },
      });

      if (existingCategory) {
        return reply.status(409).send({
          success: false,
          error: "Já existe uma categoria com este slug",
        });
      }
    }

    // Atualizar campos
    Object.assign(category, request.body);

    await categoryRepo.save(category);

    reply.send({ success: true, data: category });
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const deleteCategory = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const categoryRepo = AppDataSource.getRepository(Category);
    const productRepo = AppDataSource.getRepository(Product);

    const category = await categoryRepo.findOne({
      where: { id: id },
    });

    if (!category) {
      return reply
        .status(404)
        .send({ success: false, error: "Categoria não encontrada" });
    }

    // Verificar se há produtos associados
    const productCount = await productRepo.count({
      where: { category: { id: category.id } },
    });

    if (productCount > 0) {
      return reply.status(409).send({
        success: false,
        error: `Não é possível excluir a categoria. Existem ${productCount} produto(s) associado(s)`,
      });
    }

    await categoryRepo.remove(category);

    reply.send({ success: true, message: "Categoria excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};
