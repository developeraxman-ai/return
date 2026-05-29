import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

export const runtime = "nodejs";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const MAX_PROMPT_LENGTH = 32000;
const ACCEPTED_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024"]);
const ACCEPTED_QUALITIES = new Set(["low", "medium", "high", "auto"]);

function jsonError(message, status = 400) {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function sanitizeBaseName(value = "ai-image") {
  return String(value || "ai-image")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "ai-image";
}

function getSafeErrorMessage(error) {
  if (error?.status === 401) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local.";
  }

  if (error?.status === 429) {
    return "OpenAI image generation rate limit hit. Wait a bit and try again.";
  }

  if (error?.status === 400 && error?.message) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return "Image generation failed. Please try again.";
}

async function ensureMediaDirectory() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

async function writeImageFile(buffer, filenameBase) {
  await ensureMediaDirectory();

  const storedFilename = `${sanitizeBaseName(filenameBase)}-${Date.now()}.png`;
  const destination = path.join(MEDIA_DIR, storedFilename);
  const resolvedDestination = path.resolve(destination);
  const resolvedMediaDir = path.resolve(MEDIA_DIR);

  if (!resolvedDestination.startsWith(resolvedMediaDir + path.sep)) {
    throw new Error("Invalid generated image filename.");
  }

  await fs.writeFile(resolvedDestination, buffer);

  return {
    name: storedFilename,
    path: `/media/${storedFilename}`,
    size: buffer.length,
    mediaType: "image",
    lastModified: Date.now(),
  };
}

export async function POST(request) {
  try {
    let payload;

    try {
      payload = await request.json();
    } catch {
      return jsonError("Send JSON with an image prompt.");
    }

    const prompt = String(payload?.prompt || "").trim();
    const negativePrompt = String(payload?.negativePrompt || "").trim();
    const size = ACCEPTED_SIZES.has(payload?.size) ? payload.size : "1024x1024";
    const quality = ACCEPTED_QUALITIES.has(payload?.quality)
      ? payload.quality
      : "medium";
    const sceneNumber = Number(payload?.sceneNumber) || 1;

    if (!prompt) {
      return jsonError("Image prompt is required.");
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return jsonError("Image prompt is too long.");
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("OPENAI_API_KEY is not configured on the server.", 500);
    }

    const finalPrompt = negativePrompt
      ? `${prompt}\n\nAvoid: ${negativePrompt}`
      : prompt;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size,
      quality,
      output_format: "png",
      n: 1,
      moderation: "auto",
    });

    const image = imageResponse.data?.[0];

    if (!image?.b64_json) {
      return jsonError("OpenAI did not return image data.", 502);
    }

    const buffer = Buffer.from(image.b64_json, "base64");
    const file = await writeImageFile(buffer, `ai-scene-${sceneNumber}`);

    return Response.json({
      success: true,
      file,
      revisedPrompt: image.revised_prompt || null,
      usage: imageResponse.usage || null,
    });
  } catch (error) {
    return jsonError(getSafeErrorMessage(error), error?.status || 500);
  }
}
