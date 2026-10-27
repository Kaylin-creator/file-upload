import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@/lib/env";

// One client per server instance; Fluid Compute reuses it across requests.
const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  // Original filename, used for the download name only.
  fileName: string;
};

// Uploads synchronously and resolves once S3 has acknowledged the write.
export async function putObject(input: PutObjectInput): Promise<void> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: input.key,
        Body: input.body,
        ContentLength: input.body.byteLength,
        ContentType: input.contentType,
        // Always download, never render inline: blocks stored-XSS via the bucket URL.
        ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(input.fileName)}`,
      }),
    );
  } catch (err) {
    throw new StorageError("Failed to upload object to S3.", { cause: err });
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    );
  } catch (err) {
    throw new StorageError("Failed to delete object from S3.", { cause: err });
  }
}

export function objectUrl(key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${path}`;
}
