export type LangCode =
  | "en" | "hi" | "mr" | "te" | "ta" | "bn" | "gu" | "pa" | "kn" | "ml" | "ur";

export interface LanguageMeta {
  code: LangCode;
  name: string;
  native: string;
  bcp47: string; // for STT/TTS hints
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English",   native: "English",   bcp47: "en-IN" },
  { code: "hi", name: "Hindi",     native: "हिंदी",       bcp47: "hi-IN" },
  { code: "mr", name: "Marathi",   native: "मराठी",      bcp47: "mr-IN" },
  { code: "te", name: "Telugu",    native: "తెలుగు",      bcp47: "te-IN" },
  { code: "ta", name: "Tamil",     native: "தமிழ்",       bcp47: "ta-IN" },
  { code: "bn", name: "Bengali",   native: "বাংলা",       bcp47: "bn-IN" },
  { code: "gu", name: "Gujarati",  native: "ગુજરાતી",     bcp47: "gu-IN" },
  { code: "pa", name: "Punjabi",   native: "ਪੰਜਾਬੀ",       bcp47: "pa-IN" },
  { code: "kn", name: "Kannada",   native: "ಕನ್ನಡ",       bcp47: "kn-IN" },
  { code: "ml", name: "Malayalam", native: "മലയാളം",    bcp47: "ml-IN" },
  { code: "ur", name: "Urdu",      native: "اردو",        bcp47: "ur-IN" },
];

export const LANGUAGE_NAMES_IN_ENGLISH: Record<LangCode, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.name]),
) as Record<LangCode, string>;
