# THE RETURN Editor

A browser-based Next.js App Router creator tool for building faceless YouTube and Instagram-style videos from voiceover audio and timed script lines.

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Then set:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Run the dev server:

```bash
npm run dev
```

## Media Files

Upload background images, GIFs, and videos from the Media library inside the line inspector. The app saves uploaded files into `public/media` and returns a public path such as `/media/my-file-123.jpg`.

You can also place files in `public/media` manually.

Each line supports separate media for:

```txt
Reels 9:16
YouTube 16:9
```

Select a line, choose `Reels` or `YouTube` in the inspector's Format media control, then pick the asset for that format. The chosen asset continues forward to following lines until another asset is set for that same format.

The app uses public paths such as:

```txt
/media/dark-room.gif
/media/alarm.jpg
/media/mirror.jpg
/media/road.gif
```

The sample lines reference those paths, but no media files are bundled. Use the Media library `Refresh` button after manually adding files.

## Workflow

1. Upload a voiceover audio file in the Voiceover panel.
2. Click `Transcribe with Whisper`.
3. The browser sends multipart `FormData` to `/api/transcribe` using the `audio` field.
4. The Next.js API route calls OpenAI Whisper on the server and returns transcript text, duration, segments, and word-level timestamps.
5. Paste a script with one visual beat per line.
6. Click `Create Lines`.
7. Click `Auto-sync lines` to align script lines to Whisper word timestamps.
8. Select a line, upload or select media in the Media library, and the line receives that `/media/...` path.
9. Press play and review the active line in the 9:16 preview.
10. Adjust line start/end times with `Set Start Here`, `Set End Here`, or by dragging blocks and handles in the timeline.
11. Click `Open Fullscreen Render`, play the audio, and screen-record the 9:16 output.

## Known Limitations

- No waveform visualization yet.
- No video export yet.
- No auth, database, or saved projects.
- Auto-sync is intentionally simple and should be manually reviewed.
- Media uploads write to `public/media` on the local Next.js server. This is intended for local creator-tool use, not serverless production hosting.

## Future Improvements

- Waveform visualization using `wavesurfer.js`.
- AI suggested media per line.
- Background music layer.
- Export using Remotion or `ffmpeg.wasm`.
- Automatic script generation from transcript.
