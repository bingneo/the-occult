import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import type { StorageBackend, StorageFile } from "./types";
import { ObjectNotFoundError } from "./gcs-backend";

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;
  _s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://seaweedfs:8333",
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "any",
      secretAccessKey: process.env.S3_SECRET_KEY || "any",
    },
    forcePathStyle: true,
  });
  return _s3Client;
}

function getBucket(): string {
  return process.env.S3_BUCKET || "occult";
}

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  return dir;
}

function getPublicSearchPaths(): string[] {
  const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  return Array.from(
    new Set(
      pathsStr
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    ),
  );
}

function publicEndpoint(): string {
  return (
    process.env.S3_PUBLIC_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    "http://seaweedfs:8333"
  );
}

function rebuildUrlWithPublicHost(signedUrl: string): string {
  try {
    const u = new URL(signedUrl);
    const pub = new URL(publicEndpoint());
    u.protocol = pub.protocol;
    u.hostname = pub.hostname;
    u.port = pub.port;
    const pubPath = pub.pathname.replace(/\/+$/, "");
    if (pubPath) {
      u.pathname = pubPath + u.pathname;
    }
    return u.toString();
  } catch {
    return signedUrl;
  }
}

function s3KeyToStorageFile(bucket: string, key: string): StorageFile {
  return {
    name: key,
    async getMetadata() {
      const s3 = getS3Client();
      const head = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return {
        contentType: head.ContentType,
        contentLength: head.ContentLength,
        metadata: head.Metadata,
      } as Record<string, unknown>;
    },
    async exists(): Promise<[boolean]> {
      try {
        const s3 = getS3Client();
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return [true];
      } catch {
        return [false];
      }
    },
    createReadStream() {
      return new DeferredS3Readable(getS3Client(), bucket, key);
    },
  };
}

class DeferredS3Readable extends Readable {
  private _started = false;

  constructor(
    private s3: S3Client,
    private bucket: string,
    private key: string,
  ) {
    super();
  }

  _read(): void {
    if (this._started) return;
    this._started = true;

    this.s3
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key }))
      .then((resp) => {
        const body = resp.Body;
        if (!body) {
          this.push(null);
          return;
        }
        if (body instanceof Readable) {
          body.on("data", (chunk: Buffer) => this.push(chunk));
          body.on("end", () => this.push(null));
          body.on("error", (err: Error) => this.destroy(err));
        } else if (
          typeof (body as any).transformToWebStream === "function"
        ) {
          const webStream = (body as any).transformToWebStream();
          const reader = webStream.getReader();
          const pump = () => {
            reader
              .read()
              .then(({ done, value }: { done: boolean; value: Uint8Array }) => {
                if (done) {
                  this.push(null);
                  return;
                }
                this.push(Buffer.from(value));
                pump();
              })
              .catch((err: Error) => this.destroy(err));
          };
          pump();
        } else {
          this.push(null);
        }
      })
      .catch((err: Error) => this.destroy(err));
  }
}

export class S3StorageBackend implements StorageBackend {
  async getObjectEntityUploadURL(): Promise<string> {
    const bucket = getBucket();
    const privateDir = getPrivateObjectDir().replace(/^\/+/, "");
    const objectId = randomUUID();
    const key = `${privateDir}/uploads/${objectId}`;
    const s3 = getS3Client();
    const signed = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 900 },
    );
    return rebuildUrlWithPublicHost(signed);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      const pathname = url.pathname;
      const pub = new URL(publicEndpoint());
      const pubPathPrefix = pub.pathname.replace(/\/+$/, "");
      let relativePath = pathname;
      if (pubPathPrefix && relativePath.startsWith(pubPathPrefix)) {
        relativePath = relativePath.slice(pubPathPrefix.length);
      }
      const bucket = getBucket();
      if (relativePath.startsWith(`/${bucket}/`)) {
        relativePath = relativePath.slice(`/${bucket}`.length);
      }
      const privateDir = `/${getPrivateObjectDir().replace(/^\/+/, "")}/`;
      if (relativePath.startsWith(privateDir)) {
        const entityId = relativePath.slice(privateDir.length);
        return `/objects/${entityId}`;
      }
      return rawPath;
    } catch {
      return rawPath;
    }
  }

  async searchPublicObject(filePath: string): Promise<StorageFile | null> {
    const bucket = getBucket();
    for (const searchPath of getPublicSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`.replace(/^\/+/, "");
      const file = s3KeyToStorageFile(bucket, fullPath);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(
    file: StorageFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const metadata = await file.getMetadata();
    const contentType =
      (metadata.contentType as string) || "application/octet-stream";
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const contentLength = metadata.contentLength as number | undefined;
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (contentLength) {
      headers["Content-Length"] = String(contentLength);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();
    const entityId = parts.slice(1).join("/");

    let privateDir = getPrivateObjectDir().replace(/^\/+/, "");
    if (!privateDir.endsWith("/")) privateDir = `${privateDir}/`;
    const key = `${privateDir}${entityId}`;

    const bucket = getBucket();
    const file = s3KeyToStorageFile(bucket, key);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }
}
