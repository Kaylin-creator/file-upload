import { z } from "zod";

// Mirrors the row shape returned by GET /api/files.
export const fileRowSchema = z.object({
  document_id: z.string(),
  original_name: z.string(),
  content_type: z.string(),
  size_bytes: z.number(),
  created_at: z.string(),
});

export type FileRow = z.infer<typeof fileRowSchema>;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

type FileListProps = {
  files: FileRow[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function FileList({ files, loading, error, onRetry }: FileListProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-300 px-3 py-1.5 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!files) {
    return (
      <p role="status" className="text-sm text-zinc-600">
        Loading files…
      </p>
    );
  }

  if (files.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600">
        No files yet. Upload one above.
      </p>
    );
  }

  return (
    <div
      aria-busy={loading}
      className="overflow-x-auto rounded-md border border-zinc-300"
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-300 bg-zinc-50 text-zinc-600">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Type
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Size
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Uploaded
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {files.map((file) => (
            <tr key={file.document_id}>
              <td
                className="max-w-xs truncate px-3 py-2 font-medium"
                title={file.original_name}
              >
                {file.original_name}
              </td>
              <td className="px-3 py-2 text-zinc-600">{file.content_type}</td>
              <td className="px-3 py-2 text-right text-zinc-600 tabular-nums">
                {formatBytes(file.size_bytes)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-zinc-600">
                <time dateTime={file.created_at}>
                  {dateFormatter.format(new Date(file.created_at))}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
