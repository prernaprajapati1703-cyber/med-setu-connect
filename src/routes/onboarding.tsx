import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES, type LangCode } from "@/lib/i18n/languages";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup — MedSetu" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/auth", replace: true }); return; }
      const { data } = await supabase.from("profiles").select("display_name, preferred_language").eq("id", user.id).maybeSingle();
      if (!mounted) return;
      if (data?.display_name) navigate({ to: "/home", replace: true });
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const save = async () => {
    if (!name.trim()) return toast.error(t("your_name"));
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: name.trim(),
        age: age ? Number(age) : null,
        gender: gender || null,
        preferred_language: lang,
      });
      if (error) throw error;
      navigate({ to: "/home", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="font-display text-2xl font-bold">{step === 1 ? t("pick_language") : "Profile"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{step === 1 ? t("pick_language_sub") : "Tell us a little about you."}</p>

      {step === 1 ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => void setLang(l.code as LangCode)}
                className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-3 text-left transition ${
                  lang === l.code ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}>
                <span className="text-base font-semibold">{l.native}</span>
                <span className="text-xs text-muted-foreground">{l.name}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90">
            Next →
          </button>
        </>
      ) : (
        <div className="mt-6 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("your_name")} maxLength={80}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none" />
          <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} placeholder={t("your_age")} inputMode="numeric" maxLength={3}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none" />
          <div className="grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((g) => (
              <button key={g} onClick={() => setGender(g)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  gender === g ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}>{t(g)}</button>
            ))}
          </div>
          <button onClick={save} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("save_continue")}
          </button>
          <button onClick={() => setStep(1)} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">← change language</button>
        </div>
      )}
    </div>
  );
}
