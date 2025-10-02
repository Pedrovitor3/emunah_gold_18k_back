import "@fastify/multipart";

declare module "fastify" {
  interface FastifyRequest {
    file(options?: {
      limits?: MultipartLimits;
    }): Promise<MultipartFile | undefined>;
    files(options?: {
      limits?: MultipartLimits;
    }): AsyncIterableIterator<MultipartFile>;
    saveRequestFiles(options?: {
      limits?: MultipartLimits;
      tmpdir?: string;
    }): Promise<SavedMultipartFile[]>;
  }
}

interface MultipartFile {
  type: "file";
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
  _buf?: Buffer;
  toBuffer(): Promise<Buffer>;
}

interface SavedMultipartFile extends MultipartFile {
  filepath: string;
}

interface MultipartLimits {
  fieldNameSize?: number;
  fieldSize?: number;
  fields?: number;
  fileSize?: number;
  files?: number;
  headerPairs?: number;
}
