"use client";

import { useRef, useState } from "react";

import { formatBytes } from "@/components/file-list";
import {
  ACCEPT,
  MAX_FILE_BYTES,
  uploadFile,
  validateFile,
} from "@/components/upload-rules";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

type UploadFormProps = {
  onUploaded: () => void;
};

export function UploadForm({ onUploaded }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const pending = state.status === "uploading";
  const error = state.status === "error" ? state.message : null;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    // Validate on pick so problems show before the user presses Upload.
    const message = next && validateFile(next);
    setState(message ? { status: "error", message } : { status: "idle" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setState({ status: "error", message: "Choose a file to upload." });
      return;
    }
    const invalid = validateFile(file);
    if (invalid) {
      setState({ status: "error", message: invalid });
      return;
    }

    setState({ status: "uploading" });
    const result = await uploadFile(file);
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }

    setState({ status: "success", name: file.name });
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onUploaded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="file" className="block text-sm font-medium">
          File
        </label>
        <input
          ref={inputRef}
          id="file"
          name="file"
          type="file"
          accept={ACCEPT}
          onChange={handleChange}
          disabled={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "upload-hint upload-error" : "upload-hint"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:font-medium disabled:opacity-60"
        />
        <p id="upload-hint" className="text-xs text-zinc-600">
          {file
            ? `${file.name} · ${formatBytes(file.size)}`
            : `PDF, images, TXT, CSV, DOCX or XLSX, up to ${formatBytes(MAX_FILE_BYTES)}.`}
        </p>
      </div>

      {error && (
        <p id="upload-error" role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {state.status === "success" && (
        <p
          role="status"
          className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800"
        >
          Uploaded {state.name}.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !file}
        aria-busy={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-3 py-2 font-medium text-white disabled:opacity-60 sm:w-auto"
      >
        {pending && (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        )}
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
