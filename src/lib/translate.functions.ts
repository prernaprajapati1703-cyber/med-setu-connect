import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  keys: z.array(z.string().min(1).max(80)).min(1).max(200),
  language: z.string().min(2).max(8),
});

const SOURCE_STRINGS: Record<string, string> = {}; // populated below by inline require pattern

import { STRINGS } from "@/lib/i18n/strings";
Object.assign(SOURCE_STRINGS, STRINGS);

export const translateUiStrings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    if (data.language === "en") return {} as Record<string, string>;

    // Check cache via service role (public read, but we want full coverage)
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: cached } = await supa
      .from("ui_translations")
      .select("key,value")
      .eq("language", data.language)
      .in("key", data.keys);
    const have = new Map(cached?.map((r) => [r.key, r.value]) ?? []);
    const missing = data.keys.filter((k) => !have.has(k) && SOURCE_STRINGS[k]);

    if (missing.length) {
      const { geminiJson, languageNameInEnglish } = await import("./ai-gateway.server");
      const langName = languageNameInEnglish(data.language);
      const payload = missing.map((k) => ({ key: k, en: SOURCE_STRINGS[k] }));
      const sys = `You are translating UI strings for a healthcare app from English to ${langName}.
Return ONLY a JSON object mapping each "key" to its ${langName} translation.
Keep translations short, natural, and respectful. Preserve placeholders like {name} verbatim.
Output shape: { "translations": { [key: string]: string } }`;
      try {
        const out = await geminiJson<{ translations: Record<string, string> }>({
          systemPrompt: sys,
          userContent: [{ type: "text", text: JSON.stringify(payload) }],
        });
        const t = out.translations ?? {};
        const rows = Object.entries(t).map(([k, v]) => ({
          key: k, language: data.language, value: String(v),
        }));
        if (rows.length) {
          // Use service role to upsert (would need it — fall back to insert-on-conflict-ignore)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("ui_translations").upsert(rows, { onConflict: "key,language" });
          rows.forEach((r) => have.set(r.key, r.value));
        }
      } catch (e) {
        console.error("translate failed", e);
      }
    }

    return Object.fromEntries(have) as Record<string, string>;
  });
