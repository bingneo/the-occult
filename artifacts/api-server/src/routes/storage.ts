import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { getStorageBackend } from "../lib/storage/factory";
import { ObjectNotFoundError } from "../lib/storage/gcs-backend";

const router: IRouter = Router();

let _backend: ReturnType<typeof getStorageBackend> | null = null;
function storage() {
  if (!_backend) _backend = getStorageBackend();
  return _backend;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov", "video/quicktime"];
const ALLOWED_CONTENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for image/video upload.
 * Requires login. Only allowed types accepted.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const { name, size, contentType } = req.body ?? {};

  if (typeof name !== "string" || typeof size !== "number" || typeof contentType !== "string") {
    res.status(400).json({ error: "Missing or invalid required fields (name, size, contentType)" });
    return;
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    res.status(400).json({
      error: `不支持的文件类型 "${contentType}"，仅允许图片（JPEG/PNG/WebP/GIF）或视频（MP4/WebM）`,
    });
    return;
  }

  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);
  const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
  const maxLabel = isVideo ? "100MB" : "10MB";

  if (size > maxSize) {
    res.status(400).json({
      error: `文件过大（${(size / 1024 / 1024).toFixed(1)}MB），${isVideo ? "视频" : "图片"}最大允许 ${maxLabel}`,
    });
    return;
  }

  try {
    const uploadURL = await storage().getObjectEntityUploadURL();
    const objectPath = storage().normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets — unconditionally public.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await storage().searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await storage().downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve uploaded objects — publicly accessible.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await storage().getObjectEntityFile(objectPath);

    const response = await storage().downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
