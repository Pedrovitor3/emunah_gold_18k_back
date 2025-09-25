import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { ProductImage } from '../models/ProductImage';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PaginatedResponse } from '../models/types';

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
      page = '1',
      limit = '12',
      category,
      featured,
      search
    } = request.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const productRepo = AppDataSource.getRepository(Product);

    const queryBuilder = productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.images', 'pi')
      .where('p.is_active = :active', { active: true });

    if (category) {
      queryBuilder.andWhere('c.slug = :category', { category });
    }

    if (featured === 'true') {
      queryBuilder.andWhere('p.featured = :featured', { featured: true });
    }

    if (search) {
      queryBuilder.andWhere('(p.name ILIKE :search OR p.description ILIKE :search)', { search: `%${search}%` });
    }

    const [products, total] = await queryBuilder
      .orderBy('p.featured', 'DESC')
      .addOrderBy('p.created_at', 'DESC')
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
        totalPages
      }
    };

    reply.send(response);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
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
      relations: ['category', 'images']
    });

    if (!product) {
      return reply.status(404).send({ success: false, error: 'Produto não encontrado' });
    }

    reply.send({ success: true, data: product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
  }
};
export const getCategories = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);

    const categories = await categoryRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.products', 'p', 'p.is_active = true')
      .where('c.is_active = true')
      .loadRelationCountAndMap('c.product_count', 'c.products', 'prod', qb =>
        qb.andWhere('prod.is_active = true')
      )
      .orderBy('c.name', 'ASC')
      .getMany();

    reply.send({ success: true, data: categories });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
  }
};
export const getFeaturedProducts = async (
  request: FastifyRequest<{ Querystring: { limit?: string } }>,
  reply: FastifyReply
) => {
  try {
    const { limit = '6' } = request.query;
    const limitNum = parseInt(limit);

    const productRepo = AppDataSource.getRepository(Product);

    const products = await productRepo.find({
      where: { is_active: true, featured: true },
      relations: ['category', 'images'],
      order: { created_at: 'DESC' },
      take: limitNum
    });

    reply.send({ success: true, data: products });
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
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
  request: FastifyRequest<{ Body: CreateProductBody }>,
  reply: FastifyReply
) {
  try {
    const productRepo = AppDataSource.getRepository(Product);

    // Criar instância do produto
    const product = productRepo.create({
      category: { id: request.body.category_id },
      name: request.body.name,
      description: request.body.description ?? "",
      sku: request.body.sku,
      price: request.body.price,
      weight: request.body.weight ?? 0,
      gold_purity: request.body.gold_purity ?? "",
      stock_quantity: request.body.stock_quantity ?? 0,
      is_active: request.body.is_active ?? true,
      featured: request.body.featured ?? false,
    });

    await productRepo.save(product);

    return reply.status(201).send({ success: true, data: product });
  } catch (error) {
    return reply.status(500).send({ success: false, error: (error as Error).message });
  }
}

export async function updateProduct(
  request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: Partial<CreateProductBody> 
  }>,
  reply: FastifyReply
) {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const productId = request.params.id;

    // Verificar se o produto existe
    const existingProduct = await productRepo.findOne({
      where: { id: productId }
    });

    if (!existingProduct) {
      return reply.status(404).send({ 
        success: false, 
        error: "Product not found" 
      });
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (request.body.category_id !== undefined) {
      updateData.category = { id: request.body.category_id };
    }
    if (request.body.name !== undefined) {
      updateData.name = request.body.name;
    }
    if (request.body.description !== undefined) {
      updateData.description = request.body.description;
    }
    if (request.body.sku !== undefined) {
      updateData.sku = request.body.sku;
    }
    if (request.body.price !== undefined) {
      updateData.price = request.body.price;
    }
    if (request.body.weight !== undefined) {
      updateData.weight = request.body.weight;
    }
    if (request.body.gold_purity !== undefined) {
      updateData.gold_purity = request.body.gold_purity;
    }
    if (request.body.stock_quantity !== undefined) {
      updateData.stock_quantity = request.body.stock_quantity;
    }
    if (request.body.is_active !== undefined) {
      updateData.is_active = request.body.is_active;
    }
    if (request.body.featured !== undefined) {
      updateData.featured = request.body.featured;
    }

    // Atualizar produto
    await productRepo.update(productId, updateData);

    // Buscar produto atualizado
    const updatedProduct = await productRepo.findOne({
      where: { id: productId },
      relations: ['category'] // Incluir categoria se necessário
    });

    return reply.status(200).send({ 
      success: true, 
      data: updatedProduct 
    });

  } catch (error) {
    return reply.status(500).send({ 
      success: false, 
      error: (error as Error).message 
    });
  }
}

export async function deleteProduct(
  request: FastifyRequest<{ Params: DeleteProductParams }>,
  reply: FastifyReply
) {
  try {
    const productRepo = AppDataSource.getRepository(Product);

    // Verificar se o produto existe
    const product = await productRepo.findOne({
      where: { id: request.params.id }
    });

    if (!product) {
      return reply.status(404).send({ 
        success: false, 
        error: 'Produto não encontrado' 
      });
    }

    // Marcar como inativo ao invés de excluir
    await productRepo.update(request.params.id, { 
      is_active: false,
      // Opcional: adicionar campos de auditoria
      // deleted_at: new Date()
    });

    return reply.status(200).send({ 
      success: true, 
      message: 'Produto desativado com sucesso',
      data: { id: request.params.id }
    });

  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    return reply.status(500).send({ 
      success: false, 
      error: (error as Error).message 
    });
  }
}