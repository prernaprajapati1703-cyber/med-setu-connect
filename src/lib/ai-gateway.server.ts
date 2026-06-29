// Lovable AI Gateway helper — server-only.
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export async function geminiJson<T = unknown>(opts: {
  systemPrompt: string;
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } } | { type: "file"; file: { filename: string; file_data: string } }>;
  model?: string;
}): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body = {
    model: opts.model ?? "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userContent },
    ],
    response_format: { type: "json_object" },
  };
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(text) as T; } catch { return { raw: text } as unknown as T; }
}

export async function geminiText(opts: {
  systemPrompt: string;
  userText: string;
  model?: string;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userText },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export function languageNameInEnglish(code: string): string {
  const map: Record<string, string> = {
    en: "English", hi: "Hindi", mr: "Marathi", te: "Telugu", ta: "Tamil",
    bn: "Bengali", gu: "Gujarati", pa: "Punjabi", kn: "Kannada", ml: "Malayalam", ur: "Urdu",
  };
  return map[code] ?? "English";
}
