import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/auth";
import { jsonData, jsonError, toErrorResponse } from "@/lib/http";
import { deleteObject, objectUrl, putObject } from "@/lib/storage/s3";

import {
  matchesSignature,
  MAX_FILE_BYTES,
  MULTIPART_OVERHEAD_BYTES,
  toUploadIssue,
  UPLOAD_ERROR_STATUS,
  uploadSchema,
} from "./upload";

const FILE_COLUMNS =
  "document_id, original_name, content_type, size_bytes, created_at";

// Lists the signed-in user's files. RLS scopes rows to auth.uid().
export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("files")
      .select(FILE_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonData(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}

// Uploads one file (multipart/form-data, field "file") to S3, then records it.
export async function POST(request: Request) {
  try {
    // Auth first, so unauthenticated callers learn nothing about validation.
    const { user, supabase } = await requireUser();

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return jsonError(
        "UNSUPPORTED_CONTENT_TYPE",
        "Send the file as multipart/form-data.",
        415,
      );
    }

    // Reject obviously oversized bodies before buffering them.
    const contentLength = Number(request.headers.get("content-length"));
    if (contentLength > MAX_FILE_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return jsonError(
        "FILE_TOO_LARGE",
        `File exceeds the ${MAX_FILE_BYTES}-byte limit.`,
        413,
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError("INVALID_REQUEST", "Malformed multipart body.", 400);
    }

    const parsed = uploadSchema.safeParse({ file: form.get("file") });
    if (!parsed.success) {
      const issue = toUploadIssue(parsed.error);
      return jsonError(issue.code, issue.message, UPLOAD_ERROR_STATUS[issue.code]);
    }
    const { file, name, extension, allowed } = parsed.data;

    const body = new Uint8Array(await file.arrayBuffer());
    if (!matchesSignature(body, allowed)) {
      return jsonError(
        "UNSUPPORTED_FILE_TYPE",
        "File contents do not match its type.",
        415,
      );
    }

    // userId comes only from the session, never from the request.
    const documentId = randomUUID();
    const key = `users/${user.id}/${documentId}.${extension}`;

    try {
      await putObject({ key, body, contentType: allowed.contentType, fileName: name });
    } catch (err) {
      console.error(err);
      return jsonError("STORAGE_ERROR", "Could not store the file. Try again.", 502);
    }

    const { data, error } = await supabase
      .from("files")
      .insert({
        document_id: documentId,
        user_id: user.id,
        s3_key: key,
        s3_url: objectUrl(key),
        original_name: name,
        content_type: allowed.contentType,
        size_bytes: body.byteLength,
      })
      .select(FILE_COLUMNS)
      .single();

    if (error) {
      // Compensate so no orphaned object is left in the bucket.
      try {
        await deleteObject(key);
      } catch (cleanupErr) {
        console.error(`Orphaned S3 object ${key}`, cleanupErr);
      }
      throw error;
    }

    return jsonData(data, 201);
  } catch (err) {
    return toErrorResponse(err);
  }
}
