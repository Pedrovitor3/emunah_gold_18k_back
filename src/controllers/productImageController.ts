import { AppDataSource } from "../config/database";
import { ProductImage } from "../models/ProductImage";
import { Product } from "../models/Product";
import { FastifyReply, FastifyRequest } from "fastify";

interface CreateProductImageBody {
  product_id: string;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export const createProductImage = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const imageRepo = AppDataSource.getRepository(ProductImage);
    const productRepo = AppDataSource.getRepository(Product);
    const body = request.body as CreateProductImageBody;
    // Verificar se o produto existe
    const product = await productRepo.findOne({
      where: { id: body.product_id },
    });

    if (!product) {
      return reply
        .status(404)
        .send({ success: false, error: "Produto não encontrado" });
    }

    // Se está marcando como principal, desmarcar outras imagens principais do mesmo produto
    if (body.is_primary) {
      await imageRepo.update(
        { product_id: body.product_id, is_primary: true },
        { is_primary: false }
      );
    }

    // Se não foi especificado sort_order, usar o próximo disponível
    let sortOrder = body.sort_order ?? 0;
    if (!body.sort_order) {
      const lastImage = await imageRepo.findOne({
        where: { product_id: body.product_id },
        order: { sort_order: "DESC" },
      });
      sortOrder = (lastImage?.sort_order ?? 0) + 1;
    }

    // Criar instância da imagem
    const image = imageRepo.create({
      product: { id: body.product_id },
      product_id: body.product_id,
      image_url: body.image_url,
      alt_text: body.alt_text ?? "",
      is_primary: body.is_primary ?? false,
      sort_order: sortOrder,
    });

    await imageRepo.save(image);

    // Buscar a imagem criada com o produto
    const createdImage = await imageRepo.findOne({
      where: { id: image.id },
      relations: ["product"],
    });

    return reply.status(201).send({ success: true, data: createdImage });
  } catch (error) {
    console.error("Erro ao criar imagem:", error);
    return reply.status(500).send({
      success: false,
      error: "Erro interno do servidor",
    });
  }
};

export const deleteProductImage = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };

    const imageRepo = AppDataSource.getRepository(ProductImage);

    const image = await imageRepo.findOne({
      where: { id: id },
    });

    if (!image) {
      return reply
        .status(404)
        .send({ success: false, error: "Imagem não encontrada" });
    }

    await imageRepo.remove(image);

    reply.send({ success: true, message: "Imagem excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir imagem:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};

export const updateImageOrder = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const imageRepo = AppDataSource.getRepository(ProductImage);
    const productRepo = AppDataSource.getRepository(Product);
    const { id } = request.params as { id: string };
    const body = request.body as { imageIds: string[] };
    // Verificar se o produto existe
    const product = await productRepo.findOne({
      where: { id: id },
    });

    if (!product) {
      return reply
        .status(404)
        .send({ success: false, error: "Produto não encontrado" });
    }

    // Atualizar a ordem das imagens
    const updatePromises = body.imageIds.map((imageId, index) =>
      imageRepo.update({ id: imageId, product_id: id }, { sort_order: index })
    );

    await Promise.all(updatePromises);

    // Buscar imagens atualizadas
    const updatedImages = await imageRepo.find({
      where: { product_id: id },
      relations: ["product"],
      order: { sort_order: "ASC" },
    });

    reply.send({ success: true, data: updatedImages });
  } catch (error) {
    console.error("Erro ao atualizar ordem das imagens:", error);
    reply
      .status(500)
      .send({ success: false, error: "Erro interno do servidor" });
  }
};
