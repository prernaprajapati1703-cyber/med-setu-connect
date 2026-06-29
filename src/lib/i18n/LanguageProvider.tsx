import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES, type LangCode } from "./languages";
import { BUILT_IN, STRINGS, type StringKey } from "./strings";

type Dict = Partial<Record<StringKey, string>>;

interface LanguageCtx {
  lang: LangCode;
  setLang: (l: LangCode) => Promise<void>;
  t: (key: StringKey) => string;
  ready: boolean;
}

const Ctx = createContext<LanguageCtx | null>(null);

const STORAGE_KEY = "medsetu_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [dict, setDict] = useState<Dict>(STRINGS);
  const [ready, setReady] = useState(false);

  // Load lang from localStorage / profile
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && LANGUAGES.find((l) => l.code === stored)) {
      void applyLang(stored as LangCode);
    } else {
      setReady(true);
    }
  }, []);

  const applyLang = useCallback(async (l: LangCode) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);

    if (l === "en") { setDict(STRINGS); setReady(true); return; }
    if (BUILT_IN[l]) {
      setDict({ ...STRINGS, ...BUILT_IN[l] });
      setReady(true);
      return;
    }
    // Try cached translations
    setDict(STRINGS);
    setReady(true);
    try {
      const keys = Object.keys(STRINGS);
      const { data } = await supabase
        .from("ui_translations")
        .select("key,value")
        .eq("language", l)
        .in("key", keys);
      const cached: Dict = {};
      data?.forEach((r) => { cached[r.key as StringKey] = r.value; });
      // Fire and forget: request server translation for missing keys
      const missing = keys.filter((k) => !cached[k as StringKey]);
      if (missing.length) {
        try {
          const { translateUiStrings } = await import("@/lib/translate.functions");
          const fresh = await translateUiStrings({ data: { keys: missing, language: l } });
          Object.assign(cached, fresh);
        } catch (e) { /* fallback to english */ }
      }
      setDict({ ...STRINGS, ...cached });
    } catch (e) { /* ignore */ }
  }, []);

  const setLang = useCallback(async (l: LangCode) => {
    await applyLang(l);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ preferred_language: l }).eq("id", user.id);
      }
    } catch (e) { /* ignore */ }
  }, [applyLang]);

  const t = useCallback((key: StringKey): string => dict[key] ?? STRINGS[key] ?? key, [dict]);

  return (
    <Ctx.Provider value={{ lang, setLang, t, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
