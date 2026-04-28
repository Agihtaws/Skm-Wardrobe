import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const result: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    app: "ok",
    supabase_db: "checking",
    supabase_storage: "checking",
    env_razorpay: process.env.RAZORPAY_KEY_ID ? "ok" : "missing",
    env_delhivery: process.env.DELHIVERY_API_KEY ? "ok" : "missing",
  };

  try {
    const supabase = await createClient();

    const { error: dbError } = await supabase
      .from("categories")
      .select("id")
      .limit(1);
    result.supabase_db = dbError ? `error: ${dbError.message}` : "ok";

    const { error: storageError } = await supabase.storage.listBuckets();
    result.supabase_storage = storageError ? `error: ${storageError.message}` : "ok";
  } catch (e) {
    result.supabase_db = "unreachable";
    result.supabase_storage = "unreachable";
  }

  const allOk = Object.values(result).every(
    (v) => v === "ok" || v.includes("timestamp")
  );
  result.status = allOk ? "ok" : "degraded";

  return NextResponse.json(result, { status: allOk ? 200 : 207 });
}