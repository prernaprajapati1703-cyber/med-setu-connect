import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  fileBase64: z.string().min(20).max(20_000_000),
  mime: z.string().min(3).max(100),
  filename: z.string().min(1).max(200),
  language: z.string().min(2).max(8).default("en"),
});

interface ReportResult {
  summary: string;
  key_terms: { term: string; meaning: string }[];
  red_flags: string[];
}

export const analyzeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { geminiJson, languageNameInEnglish } = await import("./ai-gateway.server");
    const langName = languageNameInEnglish(data.language);

    const isImage = data.mime.startsWith("image/");
    const isPdf = data.mime === "application/pdf";
    if (!isImage && !isPdf) throw new Error("Only images or PDFs are supported");

    const dataUrl = `data:${data.mime};base64,${data.fileBase64}`;
    const content = isImage
      ? [{ type: "image_url" as const, image_url: { url: dataUrl } },
         { type: "text" as const, text: "Please analyze this medical report." }]
      : [{ type: "file" as const, file: { filename: data.filename, file_data: dataUrl } },
         { type: "text" as const, text: "Please analyze this medical report." }];

    const sys = `You are a friendly medical interpreter helping a patient in India understand their medical report.

Rules:
- Respond ONLY in ${langName}.
- Use simple, everyday words (no jargon). Imagine you are explaining to a non-medical family member.
- Highlight any concerning findings honestly but kindly.
- Output STRICT JSON only:
{
  "summary": string,
  "key_terms": [{ "term": string, "meaning": string }],
  "red_flags": string[]
}`;

    const result = await geminiJson<ReportResult>({ systemPrompt: sys, userContent: content });

    const { error } = await context.supabase.from("reports").insert({
      user_id: context.userId,
      mime: data.mime,
      original_name: data.filename,
      language: data.language,
      ai_summary: result.summary,
      ai_response: JSON.parse(JSON.stringify(result)),
    });
    if (error) console.error("report save failed", error);

    return result;
  });
