import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err, serverError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    // Use admin client for storage — bypasses all RLS
    const adminSupabase = createAdminClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return err("No file provided");
    if (!file.type.startsWith("image/")) return err("File must be an image");
    if (file.size > 5 * 1024 * 1024) return err("File must be under 5MB");

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    const { data, error: uploadErr } = await adminSupabase.storage
      .from("products")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadErr) return err(`Upload failed: ${uploadErr.message}`);

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from("products").getPublicUrl(data.path);

    return ok({ url: publicUrl, path: data.path });
  } catch (e) {
    return serverError(e);
  }
}