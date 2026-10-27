import { z } from "zod";

import {
  fileRowSchema,
  formatBytes,
  type FileRow,
} from "@/components/file-list";

// Client copy of the POST /api/files contract (owned by the backend).
// These checks only save a round trip; the server re-validates everything.
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MiB
const MAX_NAME_LENGTH = 255;

const ALLOWED_TYPES: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/vnd.ms-excel"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

export const ACCEPT = Object.keys(ALLOWED_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

const ALLOWED_LABEL = "PDF, PNG, JPG, GIF, WebP, TXT, CSV, DOCX or XLSX";

export const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Your session has expired. Sign in again to upload.",
  UNSUPPORTED_CONTENT_TYPE:
    "The upload couldn't be sent. Refresh and try again.",
  INVALID_REQUEST:
    "That file couldn't be read. Check the file name and try again.",
  EMPTY_FILE: "That file is empty. Choose a file with content.",
  FILE_TOO_LARGE: `That file is too large. The limit is ${formatBytes(MAX_FILE_BYTES)}.`,
  UNSUPPORTED_FILE_TYPE: `That file type isn't allowed. Upload a ${ALLOWED_LABEL} file.`,
  STORAGE_ERROR: "We couldn't store your file. Try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Try again.",
};

const FALLBACK_MESSAGE = "Upload failed. Try again.";
const NETWORK_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

// Returns an error message, or null when the file passes the client-side checks.
export function validateFile(file: File): string | null {
  if (file.size === 0) return ERROR_MESSAGES.EMPTY_FILE;
  if (file.size > MAX_FILE_BYTES) return ERROR_MESSAGES.FILE_TOO_LARGE;
  if (file.name.length === 0 || file.name.length > MAX_NAME_LENGTH) {
    return ERROR_MESSAGES.INVALID_REQUEST;
  }

  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  const mimeTypes = ALLOWED_TYPES[ext];
  if (!mimeTypes || !mimeTypes.includes(file.type)) {
    return ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE;
  }
  return null;
}

const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
const successBodySchema = z.object({ data: fileRowSchema });

export type UploadResult =
  | { ok: true; file: FileRow }
  | { ok: false; code: string | null; message: string };

export async function uploadFile(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);

  let res: Response;
  try {
    // No Content-Type header: the browser sets the multipart boundary.
    res = await fetch("/api/files", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, code: null, message: NETWORK_MESSAGE };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = undefined;
  }

  // Vercel rejects oversized bodies with a non-JSON 413 before our route runs.
  if (res.status === 413 || json === undefined) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }

  if (res.ok) {
    const parsed = successBodySchema.safeParse(json);
    if (parsed.success) return { ok: true, file: parsed.data.data };
    return { ok: false, code: null, message: FALLBACK_MESSAGE };
  }

  const parsed = errorBodySchema.safeParse(json);
  const code = parsed.success ? parsed.data.error.code : null;
  return {
    ok: false,
    code,
    message: (code && ERROR_MESSAGES[code]) || FALLBACK_MESSAGE,
  };
}
