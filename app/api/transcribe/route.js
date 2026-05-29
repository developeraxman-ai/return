import OpenAI from "openai";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";

const ACCEPTED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
]);

const ACCEPTED_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "mp4",
  "webm",
  "ogg",
]);

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
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isAcceptedAudioFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const extension = getExtension(file?.name || "");

  return ACCEPTED_AUDIO_TYPES.has(type) || ACCEPTED_EXTENSIONS.has(extension);
}

function getSafeErrorMessage(error) {
  if (error?.status === 401) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local.";
  }

  if (error?.status === 413) {
    return "The audio file is too large for transcription.";
  }

  if (error?.message) {
    return error.message;
  }

  return "Transcription failed. Please try again.";
}

export async function POST(request) {
  try {
    let formData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError("Send multipart form data with an audio file in the audio field.");
    }

    const audio = formData.get("audio");

    if (!audio || typeof audio.arrayBuffer !== "function") {
      return jsonError("Upload an audio file in the audio field.");
    }

    if (!audio.size) {
      return jsonError("The uploaded audio file is empty.");
    }

    if (!isAcceptedAudioFile(audio)) {
      return jsonError("Unsupported audio type. Use MP3, WAV, M4A, MP4, WebM, or OGG.");
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("OPENAI_API_KEY is not configured on the server.", 500);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(buffer, audio.name || "voiceover.webm", {
      type: audio.type || "application/octet-stream",
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
      language: "en",
      prompt:
        "The audio is a motivational/self-transformation YouTube script in Indian English/Bangalore slang. Words may include bro, boss, gym, Instagram, drinking, scrolling, THE RETURN.",
    });

    return Response.json({
      success: true,
      text: transcription.text || "",
      duration: transcription.duration || null,
      words: transcription.words || [],
      segments: transcription.segments || [],
    });
  } catch (error) {
    return jsonError(getSafeErrorMessage(error), error?.status || 500);
  }
}
