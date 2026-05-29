"use client";

import { useEffect, useRef, useState } from "react";

function formatBytes(bytes) {
  const size = Number(bytes) || 0;

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaThumbnail({ file }) {
  const commonClass = "h-16 w-11 shrink-0 rounded border border-white/10 bg-black object-cover";

  if (file.mediaType === "video") {
    return (
      <video
        src={file.path}
        className={commonClass}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={file.path} alt="" className={commonClass} />;
}

export default function MediaLibrary({ selectedPath, onSelect }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadFiles() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/media", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not load media files.");
      }

      setFiles(Array.isArray(payload.files) ? payload.files : []);
    } catch (loadError) {
      setError(loadError.message || "Could not load media files.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleUpload(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) {
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("Uploading media...");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("media", file));

      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Media upload failed.");
      }

      const uploadedFiles = Array.isArray(payload.files) ? payload.files : [];
      setFiles((currentFiles) => {
        const uploadedPaths = new Set(uploadedFiles.map((file) => file.path));
        return [
          ...uploadedFiles,
          ...currentFiles.filter((file) => !uploadedPaths.has(file.path)),
        ];
      });

      if (uploadedFiles[0]) {
        onSelect(uploadedFiles[0]);
      }

      setMessage(
        uploadedFiles.length === 1
          ? `Saved ${uploadedFiles[0].path}`
          : `Saved ${uploadedFiles.length} files to public/media.`
      );
    } catch (uploadError) {
      setError(uploadError.message || "Media upload failed.");
      setMessage("");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Media library
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Upload files directly into public/media.
          </p>
        </div>
        <button
          type="button"
          onClick={loadFiles}
          disabled={isLoading}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          {isLoading ? "Loading" : "Refresh"}
        </button>
      </div>

      <label className="mt-3 block cursor-pointer rounded-md border border-dashed border-white/15 bg-black/30 p-3 text-sm transition hover:border-cyan-300/60 hover:bg-cyan-300/5">
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
          multiple
          onChange={handleUpload}
        />
        <span className="block font-black uppercase tracking-[0.12em] text-white">
          {isUploading ? "Uploading..." : "Upload media"}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          JPG, PNG, WebP, GIF, MP4, WebM, or MOV
        </span>
      </label>

      {message ? <p className="mt-3 text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

      <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
        {!files.length ? (
          <p className="rounded-md border border-white/10 bg-black/25 p-3 text-xs text-slate-500">
            No uploaded media found yet.
          </p>
        ) : (
          files.map((file) => {
            const isSelected = selectedPath === file.path;

            return (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelect(file)}
                className={`flex w-full items-center gap-3 rounded-md border p-2 text-left transition ${
                  isSelected
                    ? "border-cyan-300/60 bg-cyan-300/10"
                    : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <MediaThumbnail file={file} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-100">
                    {file.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {file.path}
                  </span>
                  <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {file.mediaType} / {formatBytes(file.size)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
