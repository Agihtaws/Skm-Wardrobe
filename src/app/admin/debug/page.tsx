"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } }    = await supabase.auth.getUser();
      const { data: profile }     = await supabase
        .from("profiles").select("*").eq("id", user?.id ?? "").single();
      const { data: isAdmin }     = await supabase
        .rpc("is_admin");
      const { data: attrTest, error: attrErr } = await supabase
        .from("attributes").insert({ name: "__debug_test__" }).select().single();
      if (attrTest) {
        await supabase.from("attributes").delete().eq("id", attrTest.id);
      }

      setInfo({
        userId:    user?.id,
        email:     user?.email,
        profile,
        isAdmin,
        attrInsertSuccess: !!attrTest,
        attrInsertError:   attrErr?.message,
        sessionExists: !!session,
      });
    };
    run();
  }, []);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Debug Info</h1>
      <pre className="bg-gray-100 rounded-xl p-4 text-xs overflow-auto whitespace-pre-wrap">
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}