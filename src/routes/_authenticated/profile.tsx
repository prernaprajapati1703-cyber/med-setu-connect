import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES, type LangCode } from "@/lib/i18n/languages";
import { User, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { grantSelfAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — MedSetu" }] }),
  component: ProfilePage,
});

interface Profile {
  display_name: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  abha_id: string | null;
  aadhaar_last4: string | null;
  preferred_language: string;
}

function ProfilePage() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const grant = useServerFn(grantSelfAdmin);
  const [p, setP] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");
    const { data } = await supabase.from("profiles").select("display_name,age,gender,phone,abha_id,aadhaar_last4,preferred_language").eq("id", user.id).maybeSingle();
    setP(data ?? null);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!p) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("profiles").update({
        display_name: p.display_name, age: p.age, gender: p.gender, phone: p.phone, abha_id: p.abha_id,
        preferred_language: p.preferred_language,
      }).eq("id", user.id);
      if (error) throw error;
      toast.success(t("success"));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const enableAdminDemo = async () => {
    await grant({});
    toast.success("Admin access granted (demo). Reload the Dashboard.");
  };

  if (!p) return <AppShell><div className="text-sm text-muted-foreground">{t("loading")}</div></AppShell>;

  return (
    <AppShell title={t("profile_title")}>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><User className="h-6 w-6" /></div>
        <div>
          <h1 className="font-display text-xl font-bold">{p.display_name ?? "—"}</h1>
          <p className="text-xs text-muted-foreground">{email}{p.aadhaar_last4 ? ` · Aadhaar ••••${p.aadhaar_last4}` : ""}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Field label={t("your_name")} value={p.display_name ?? ""} onChange={(v) => setP({ ...p, display_name: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("your_age")} value={p.age?.toString() ?? ""} onChange={(v) => setP({ ...p, age: v ? Number(v.replace(/\D/g, "")) : null })} inputMode="numeric" maxLength={3} />
          <Field label={t("phone")} value={p.phone ?? ""} onChange={(v) => setP({ ...p, phone: v })} maxLength={20} />
        </div>
        <Field label={t("abha_id")} value={p.abha_id ?? ""} onChange={(v) => setP({ ...p, abha_id: v })} maxLength={20} />

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("language")}</span>
          <select
            value={lang}
            onChange={(e) => { void setLang(e.target.value as LangCode); setP({ ...p, preferred_language: e.target.value }); }}
            className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native} — {l.name}</option>)}
          </select>
        </label>

        <button onClick={save} disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t("save")}
        </button>
      </div>

      <div className="mt-6 space-y-2">
        <button onClick={enableAdminDemo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary">
          <ShieldCheck className="h-4 w-4 text-accent" /> Enable Admin Dashboard (demo)
        </button>
        <button onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />{t("sign_out")}
        </button>
      </div>
    </AppShell>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; inputMode?: "numeric" | "text"; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{props.label}</span>
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)} inputMode={props.inputMode} maxLength={props.maxLength}
        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
    </label>
  );
}
