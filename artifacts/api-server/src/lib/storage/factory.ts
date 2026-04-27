import type { StorageBackend } from "./types";
import { GcsStorageBackend } from "./gcs-backend";
import { S3StorageBackend } from "./s3-backend";

let _backend: StorageBackend | null = null;

export function getStorageBackend(): StorageBackend {
  if (_backend) return _backend;

  const backend = (process.env.STORAGE_BACKEND || "gcs").toLowerCase();

  if (backend === "s3") {
    _backend = new S3StorageBackend();
  } else {
    _backend = new GcsStorageBackend();
  }

  return _backend;
}
