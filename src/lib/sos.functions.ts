import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SOSInput = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  language: z.string().min(2).max(8).default("en"),
});

const MESSAGES: Record<string, string> = {
  en: "Patient needs urgent help at this location.",
  hi: "मरीज़ को इस स्थान पर तत्काल मदद चाहिए।",
  mr: "रुग्णाला या ठिकाणी तातडीने मदत हवी आहे.",
  te: "రోగికి ఈ ప్రదేశంలో అత్యవసర సహాయం అవసరం.",
  ta: "நோயாளிக்கு இந்த இடத்தில் அவசர உதவி தேவை.",
  bn: "রোগীর এই স্থানে জরুরি সাহায্য প্রয়োজন।",
  gu: "દર્દીને આ સ્થળે તાત્કાલિક મદદની જરૂર છે.",
  pa: "ਮਰੀਜ਼ ਨੂੰ ਇਸ ਥਾਂ 'ਤੇ ਤੁਰੰਤ ਮਦਦ ਚਾਹੀਦੀ ਹੈ।",
  kn: "ರೋಗಿಗೆ ಈ ಸ್ಥಳದಲ್ಲಿ ತುರ್ತು ಸಹಾಯ ಬೇಕು.",
  ml: "ഈ സ്ഥലത്ത് രോഗിക്ക് അടിയന്തര സഹായം ആവശ്യമാണ്.",
  ur: "مریض کو اس مقام پر فوری مدد درکار ہے۔",
};

export const createSosAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SOSInput.parse(d))
  .handler(async ({ data, context }) => {
    const message = MESSAGES[data.language] ?? MESSAGES.en;
    const { data: row, error } = await context.supabase.from("emergency_alerts").insert({
      user_id: context.userId,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      message,
      language: data.language,
    }).select().single();
    if (error) throw new Error(error.message);
    return { id: row.id, message };
  });
