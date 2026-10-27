"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { FileList, fileRowSchema, type FileRow } from "@/components/file-list";
import { UploadForm } from "@/components/upload-form";

const listResponseSchema = z.object({ data: z.array(fileRowSchema) });

const LOAD_ERROR = "Couldn't load your files. Try again.";

async function fetchFiles(): Promise<FileRow[]> {
  const res = await fetch("/api/files", { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/files failed: ${res.status}`);
  const parsed = listResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Unexpected /api/files response");
  return parsed.data.data;
}

export function FileManager() {
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load: state already starts as loading, so only set it after the await.
  useEffect(() => {
    let cancelled = false;
    fetchFiles()
      .then((rows) => !cancelled && setFiles(rows))
      .catch(() => !cancelled && setError(LOAD_ERROR))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFiles(await fetchFiles());
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <section aria-labelledby="upload-heading" className="space-y-4">
        <h2 id="upload-heading" className="text-lg font-semibold">
          Upload a file
        </h2>
        <UploadForm onUploaded={loadFiles} />
      </section>

      <section aria-labelledby="files-heading" className="space-y-4">
        <h2 id="files-heading" className="text-lg font-semibold">
          Your files
        </h2>
        <FileList
          files={files}
          loading={loading}
          error={error}
          onRetry={loadFiles}
        />
      </section>
    </div>
  );
}
