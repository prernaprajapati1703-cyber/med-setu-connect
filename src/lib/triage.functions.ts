import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  text: z.string().trim().min(3).max(2000),
  language: z.string().min(2).max(8).default("en"),
  region: z.string().max(120).optional(),
});

interface TriageResult {
  condition: string;
  severity: "low" | "medium" | "high";
  specialist: string;
  precautions: string[];
  explanation: string;
}

export const triageSymptoms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { geminiJson, languageNameInEnglish } = await import("./ai-gateway.server");
    const langName = languageNameInEnglish(data.language);
    const sys = `You are a careful medical triage assistant for India. Read the patient's described symptoms and produce a SAFE preliminary assessment.

Rules:
- Respond ONLY in ${langName}. All fields (condition, specialist, precautions, explanation) must be in ${langName}.
- Severity must be exactly one of: "low", "medium", "high". Use "high" for chest pain, breathing trouble, stroke signs, severe bleeding, unconsciousness, pregnancy emergencies, severe dehydration in children/elderly.
- Be conservative: when in doubt, recommend a doctor visit.
- Output STRICT JSON only with this exact shape:
{
  "condition": string,
  "severity": "low"|"medium"|"high",
  "specialist": string,
  "precautions": string[4],
  "explanation": string
}`;

    const result = await geminiJson<TriageResult>({
      systemPrompt: sys,
      userContent: [{ type: "text", text: data.text }],
    });

    // Normalize
    const severity = (["low", "medium", "high"] as const).includes(result.severity as "low" | "medium" | "high")
      ? result.severity as "low" | "medium" | "high" : "medium";

    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("symptoms").insert({
      user_id: userId,
      input_text: data.text,
      language: data.language,
      condition: result.condition,
      severity,
      specialist: result.specialist,
      precautions: result.precautions ?? [],
      ai_response: JSON.parse(JSON.stringify(result)),
      region: data.region,
    }).select().single();

    if (error) throw new Error(error.message);
    return { ...result, severity, id: row.id };
  });

export const listTriageHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("symptoms")
      .select("id, input_text, condition, severity, specialist, language, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
