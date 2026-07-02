import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createSosAlert } from "@/lib/sos.functions";
import { searchNearbyHospitals } from "@/lib/hospitals.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Siren, Phone, Plus, Trash2, CheckCircle2, MapPin, Navigation, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface NearbyHospital {
  place_id: string;
  name: string;
  address?: string;
  lat: number; lng: number;
  emergency_24h?: boolean;
  distance_m?: number;
  phone?: string;
}

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({ meta: [{ title: "Emergency SOS — MedSetu" }] }),
  component: SosPage,
});

interface Contact { id: string; name: string; phone: string; relation: string | null; }

function SosPage() {
  const { t, lang } = useLang();
  const sos = useServerFn(createSosAlert);
  const findHospitals = useServerFn(searchNearbyHospitals);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearby, setNearby] = useState<NearbyHospital[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const HOLD_MS = 3000;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("emergency_contacts").select("id,name,phone,relation");
      setContactsList(data ?? []);
    })();
  }, [sent]);

  const trigger = async () => {
    setBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000 });
      });
      const lat = pos?.coords.latitude;
      const lng = pos?.coords.longitude;
      if (lat != null && lng != null) setCoords({ lat, lng });
      await sos({ data: { lat, lng, language: lang } });
      setSent(true);
      toast.success(t("sos_sent"));
      // Fetch nearest hospitals in the background
      if (lat != null && lng != null) {
        try {
          const list = await findHospitals({ data: { lat, lng, radiusMeters: 8000 } });
          setNearby(list.slice(0, 5));
        } catch { /* non-blocking */ }
      }
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

      {sent && (
        <NotifyFamily coords={coords} contacts={contactsList} />
      )}

      {sent && (
        <NearbyHospitalsPanel hospitals={nearby} coords={coords} />
      )}

      <Contacts />
    </AppShell>
  );
}

function NotifyFamily({ coords, contacts }: { coords: { lat: number; lng: number } | null; contacts: Contact[] }) {
  if (contacts.length === 0) return null;
  const mapLink = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";
  const msg = `🚨 EMERGENCY (MedSetu SOS): I need help. ${coords ? `My location: ${mapLink}` : "Location unavailable."}`;
  const encoded = encodeURIComponent(msg);
  const allNumbers = contacts.map((c) => c.phone).join(",");
  return (
    <section className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-destructive">
        <Share2 className="h-4 w-4" /> Notify family
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Send your live location to all emergency contacts in one tap.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`sms:${allNumbers}?body=${encoded}`} className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">
          <MessageCircle className="h-4 w-4" /> SMS all
        </a>
        {contacts.map((c) => (
          <a key={c.id} href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encoded}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:opacity-90">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp {c.name.split(" ")[0]}
          </a>
        ))}
      </div>
    </section>
  );
}

function NearbyHospitalsPanel({ hospitals, coords }: { hospitals: NearbyHospital[]; coords: { lat: number; lng: number } | null }) {
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <MapPin className="h-4 w-4 text-primary" /> Nearest hospitals
      </h2>
      {hospitals.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Searching hospitals near you…</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {hospitals.map((h) => (
            <li key={h.place_id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${h.emergency_24h ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {h.distance_m != null ? `${(h.distance_m / 1000).toFixed(1)} km` : ""}
                  {h.emergency_24h ? " · 24×7" : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {h.phone && (
                  <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-medium text-success-foreground">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                <a
                  href={coords ? `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${h.lat},${h.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                  <Navigation className="h-3 w-3" /> Go
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
