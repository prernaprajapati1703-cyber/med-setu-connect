import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createSosAlert } from "@/lib/sos.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Siren, Phone, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({ meta: [{ title: "Emergency SOS — MedSetu" }] }),
  component: SosPage,
});

interface Contact { id: string; name: string; phone: string; relation: string | null; }

function SosPage() {
  const { t, lang } = useLang();
  const sos = useServerFn(createSosAlert);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const HOLD_MS = 3000;

  const trigger = async () => {
    setBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 6000 });
      });
      await sos({
        data: {
          lat: pos?.coords.latitude, lng: pos?.coords.longitude,
          language: lang,
        },
      });
      setSent(true);
      toast.success(t("sos_sent"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "SOS failed");
    } finally {
      setBusy(false);
    }
  };

  const startHold = () => {
    if (busy || sent) return;
    setHolding(true);
    setProgress(0);
    const start = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timer.current!); timer.current = null;
        setHolding(false);
        void trigger();
      }
    }, 50);
  };
  const cancelHold = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setHolding(false);
    setProgress(0);
  };

  return (
    <AppShell title={t("sos_title")}>
      <div className="flex items-center gap-2">
        <Siren className="h-5 w-5 text-destructive" />
        <h1 className="font-display text-lg font-semibold">{t("sos_title")}</h1>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <button
          onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold}
          disabled={sent || busy}
          className={`relative grid h-48 w-48 place-items-center rounded-full font-display text-2xl font-bold uppercase tracking-widest text-destructive-foreground shadow-xl transition
            ${sent ? "bg-success" : "bg-destructive"} ${!sent && !busy ? "pulse-ring" : ""}`}
          aria-label="SOS"
        >
          {sent ? <CheckCircle2 className="h-16 w-16" /> : busy ? "…" : "SOS"}
          {holding && (
            <span className="pointer-events-none absolute inset-1 rounded-full border-4 border-white/80"
              style={{ clipPath: `inset(${100 - progress * 100}% 0 0 0)` }} />
          )}
        </button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {sent ? t("sos_sent") : busy ? t("sos_sending") : t("sos_hold")}
        </p>
      </div>

      <Contacts />
    </AppShell>
  );
}

function Contacts() {
  const { t } = useLang();
  const [list, setList] = useState<Contact[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [relation, setRelation] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("emergency_contacts").select("id,name,phone,relation").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user.id, name: name.trim(), phone: phone.trim(), relation: relation.trim() || null,
    });
    if (error) return toast.error(error.message);
    setName(""); setPhone(""); setRelation(""); setAdding(false);
    void load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{t("emergency_contacts")}</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
            <Plus className="h-3.5 w-3.5" />{t("add_contact")}
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} required maxLength={80}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone")} required type="tel" maxLength={20}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder={t("relation")} maxLength={40}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("save")}</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">{t("cancel")}</button>
          </div>
        </form>
      )}

      <ul className="mt-3 space-y-2">
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.phone}{c.relation ? ` · ${c.relation}` : ""}</p>
            </div>
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-medium text-success-foreground">
              <Phone className="h-3.5 w-3.5" /> {t("call")}
            </a>
            <button onClick={() => void remove(c.id)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label={t("delete")}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
