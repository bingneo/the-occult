import type { Readable } from "stream";

export interface StorageFile {
  name: string;
  getMetadata(): Promise<Record<string, unknown>>;
  exists(): Promise<[boolean]>;
  createReadStream(): Readable;
}

export interface StorageBackend {
  getObjectEntityUploadURL(): Promise<string>;
  normalizeObjectEntityPath(rawPath: string): string;
  searchPublicObject(filePath: string): Promise<StorageFile | null>;
  downloadObject(
    file: StorageFile,
    cacheTtlSec?: number,
  ): Promise<Response>;
  getObjectEntityFile(objectPath: string): Promise<StorageFile>;
}
