import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const MAX_MEDIA_SIZE_BYTES = 100 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "mp4",
  "webm",
  "mov",
]);

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function jsonError(message, status = 400) {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function getExtension(filename = "") {
  const extension = path.extname(filename).replace(".", "").toLowerCase();
  return extension || "";
}

function inferExtension(file) {
  const extension = getExtension(file?.name || "");
  if (extension) {
    return extension;
  }

  return MIME_EXTENSIONS[String(file?.type || "").toLowerCase()] || "";
}

function inferMediaTypeFromExtension(extension) {
  if (extension === "gif") {
    return "gif";
  }

  if (["mp4", "webm", "mov"].includes(extension)) {
    return "video";
  }

  return "image";
}

function isAcceptedMediaFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const extension = inferExtension(file);

  return ACCEPTED_TYPES.has(type) || ACCEPTED_EXTENSIONS.has(extension);
}

function sanitizeBaseName(filename = "media") {
  const parsed = path.parse(filename);
  const baseName = parsed.name || "media";

  return baseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "media";
}

function createStoredFilename(file, index) {
  const extension = inferExtension(file);
  const safeBaseName = sanitizeBaseName(file?.name || "media");
  const suffix = `${Date.now()}-${index + 1}`;

  return `${safeBaseName}-${suffix}.${extension}`;
}

async function ensureMediaDirectory() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

async function getMediaFiles() {
  await ensureMediaDirectory();

  const entries = await fs.readdir(MEDIA_DIR, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const extension = getExtension(entry.name);

    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      continue;
    }

    const filePath = path.join(MEDIA_DIR, entry.name);
    const stat = await fs.stat(filePath);

    files.push({
      name: entry.name,
      path: `/media/${entry.name}`,
      size: stat.size,
      mediaType: inferMediaTypeFromExtension(extension),
      lastModified: stat.mtimeMs,
    });
  }

  return files.sort((a, b) => b.lastModified - a.lastModified);
}

export async function GET() {
  try {
    const files = await getMediaFiles();

    return Response.json({
      success: true,
      files,
    });
  } catch {
    return jsonError("Could not read public/media.", 500);
  }
}

export async function POST(request) {
  try {
    let formData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError("Send multipart form data with media files in the media field.");
    }

    const files = formData
      .getAll("media")
      .filter((file) => file && typeof file.arrayBuffer === "function");

    if (!files.length) {
      return jsonError("Upload at least one image, GIF, or video in the media field.");
    }

    await ensureMediaDirectory();

    const uploadedFiles = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      if (!file.size) {
        return jsonError("One uploaded media file is empty.");
      }

      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        return jsonError("Media files must be 100 MB or smaller.");
      }

      if (!isAcceptedMediaFile(file)) {
        return jsonError("Unsupported media type. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.");
      }

      const extension = inferExtension(file);
      const storedFilename = createStoredFilename(file, index);
      const destination = path.join(MEDIA_DIR, storedFilename);
      const resolvedDestination = path.resolve(destination);
      const resolvedMediaDir = path.resolve(MEDIA_DIR);

      if (!resolvedDestination.startsWith(resolvedMediaDir + path.sep)) {
        return jsonError("Invalid media filename.");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(resolvedDestination, buffer);

      uploadedFiles.push({
        name: storedFilename,
        path: `/media/${storedFilename}`,
        size: file.size,
        mediaType: inferMediaTypeFromExtension(extension),
        lastModified: Date.now(),
      });
    }

    return Response.json({
      success: true,
      files: uploadedFiles,
    });
  } catch {
    return jsonError("Media upload failed. Please try again.", 500);
  }
}
