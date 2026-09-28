import { requireUser } from "@/lib/auth";
import { jsonData, toErrorResponse } from "@/lib/http";

// Lists the signed-in user's files. RLS scopes rows to auth.uid().
export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("files")
      .select(
        "document_id, original_name, content_type, size_bytes, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonData(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
