import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";

// Vercel rejects function request bodies over 4.5 MB (before our code runs).
// Cap files at 4 MiB so the multipart framing always fits under that limit,
// even if MAX_UPLOAD_BYTES is set higher.
const VERCEL_SAFE_MAX_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_BYTES = Math.min(
  env.MAX_UPLOAD_BYTES,
  VERCEL_SAFE_MAX_BYTES,
);

// Headroom for multipart boundaries and part headers when pre-checking Content-Length.
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

type AllowedType = {
  contentType: string;
  // MIME types browsers may report for this extension.
  accepts: readonly string[];
  // Leading magic bytes; omitted for plain-text formats.
  signature?: readonly number[];
};

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46, 0x38]; // GIF8
const RIFF = [0x52, 0x49, 0x46, 0x46]; // WebP container
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // OOXML container

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Keyed by lowercase extension. SVG/HTML are deliberately excluded (scriptable).
export const ALLOWED_TYPES: Readonly<Record<string, AllowedType>> = {
  pdf: { contentType: "application/pdf", accepts: ["application/pdf"], signature: PDF },
  png: { contentType: "image/png", accepts: ["image/png"], signature: PNG },
  jpg: { contentType: "image/jpeg", accepts: ["image/jpeg"], signature: JPEG },
  jpeg: { contentType: "image/jpeg", accepts: ["image/jpeg"], signature: JPEG },
  gif: { contentType: "image/gif", accepts: ["image/gif"], signature: GIF },
  webp: { contentType: "image/webp", accepts: ["image/webp"], signature: RIFF },
  txt: { contentType: "text/plain", accepts: ["text/plain"] },
  // Windows browsers report .csv as application/vnd.ms-excel when Excel is installed.
  csv: { contentType: "text/csv", accepts: ["text/csv", "application/vnd.ms-excel"] },
  docx: { contentType: DOCX, accepts: [DOCX], signature: ZIP },
  xlsx: { contentType: XLSX, accepts: [XLSX], signature: ZIP },
};

export type UploadErrorCode =
  | "INVALID_REQUEST"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE";

export const UPLOAD_ERROR_STATUS: Record<UploadErrorCode, number> = {
  INVALID_REQUEST: 400,
  EMPTY_FILE: 400,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
};

// Strips any client path, control characters and surrounding whitespace.
function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function fail(
  ctx: z.RefinementCtx,
  uploadCode: UploadErrorCode,
  message: string,
) {
  ctx.addIssue({ code: "custom", message, params: { uploadCode } });
}

export const uploadSchema = z
  .object({
    file: z.instanceof(File, {
      message: 'Expected a file in the "file" form field.',
    }),
  })
  .superRefine(({ file }, ctx) => {
    const name = sanitizeFileName(file.name);
    if (name.length === 0 || name.length > 255) {
      return fail(ctx, "INVALID_REQUEST", "File name must be 1-255 characters.");
    }
    if (file.size === 0) {
      return fail(ctx, "EMPTY_FILE", "The file is empty.");
    }
    if (file.size > MAX_FILE_BYTES) {
      return fail(
        ctx,
        "FILE_TOO_LARGE",
        `File exceeds the ${MAX_FILE_BYTES}-byte limit.`,
      );
    }
    const allowed = ALLOWED_TYPES[extensionOf(name)];
    if (!allowed || !allowed.accepts.includes(file.type.toLowerCase())) {
      return fail(ctx, "UNSUPPORTED_FILE_TYPE", "This file type is not allowed.");
    }
  })
  .transform(({ file }) => {
    const name = sanitizeFileName(file.name);
    const allowed = ALLOWED_TYPES[extensionOf(name)]!;
    return { file, name, extension: extensionOf(name), allowed };
  });

export type ValidatedUpload = z.infer<typeof uploadSchema>;

export type UploadIssue = { code: UploadErrorCode; message: string };

export function toUploadIssue(error: z.ZodError): UploadIssue {
  const issue = error.issues[0];
  const params =
    issue?.code === "custom"
      ? (issue.params as { uploadCode?: UploadErrorCode } | undefined)
      : undefined;
  return {
    code: params?.uploadCode ?? "INVALID_REQUEST",
    message: issue?.message ?? "Invalid upload.",
  };
}

// Declared MIME types are client-controlled; confirm binary formats by content.
export function matchesSignature(
  bytes: Uint8Array,
  allowed: AllowedType,
): boolean {
  const sig = allowed.signature;
  if (!sig) return true;
  if (bytes.length < sig.length) return false;
  if (!sig.every((b, i) => bytes[i] === b)) return false;
  // WebP is RIFF....WEBP; RIFF alone also matches WAV/AVI.
  if (allowed.contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
    );
  }
  return true;
}
