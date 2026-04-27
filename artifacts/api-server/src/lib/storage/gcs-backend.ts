import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import type { StorageBackend, StorageFile } from "./types";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
        "tool and set PRIVATE_OBJECT_DIR env var.",
    );
  }
  return dir;
}

function getPublicSearchPaths(): string[] {
  const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  const paths = Array.from(
    new Set(
      pathsStr
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    ),
  );
  if (paths.length === 0) {
    throw new Error(
      "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
        "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths).",
    );
  }
  return paths;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3)
    throw new Error("Invalid path: must contain at least a bucket name");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectURL(params: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: params.bucketName,
    object_name: params.objectName,
    method: params.method,
    expires_at: new Date(Date.now() + params.ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`,
    );
  }
  const data = (await response.json()) as { signed_url?: string };
  return data.signed_url || "";
}

async function getMetadata(metadata: File): Promise<Record<string, unknown>> {
  const [meta] = await metadata.getMetadata();
  return meta as Record<string, unknown>;
}

function gcsFileToStorageFile(gcsFile: File): StorageFile {
  return {
    name: gcsFile.name,
    getMetadata: () => getMetadata(gcsFile),
    exists: () => gcsFile.exists() as Promise<[boolean]>,
    createReadStream: () => gcsFile.createReadStream(),
  };
}

export class GcsStorageBackend implements StorageBackend {
  async getObjectEntityUploadURL(): Promise<string> {
    const privateDir = getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let entityDir = getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    if (!rawObjectPath.startsWith(entityDir)) return rawObjectPath;
    const entityId = rawObjectPath.slice(entityDir.length);
    return `/objects/${entityId}`;
  }

  async searchPublicObject(filePath: string): Promise<StorageFile | null> {
    for (const searchPath of getPublicSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = gcsClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) return gcsFileToStorageFile(file);
    }
    return null;
  }

  async downloadObject(
    file: StorageFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const metadata = await file.getMetadata();
    const aclPolicyRaw = (metadata?.metadata as Record<string, string>)?.[
      "custom:aclPolicy"
    ];
    const aclPolicy = aclPolicyRaw
      ? (JSON.parse(aclPolicyRaw) as { visibility?: string })
      : null;
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, {
      headers: {
        "Content-Type":
          (metadata.contentType as string) || "application/octet-stream",
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      },
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();
    const entityId = parts.slice(1).join("/");
    let entityDir = getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const fullPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = gcsClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return gcsFileToStorageFile(objectFile);
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}
