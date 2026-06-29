import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { AlarmClockCheck, Plus, Trash2, Check, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/medicines")({
  head: () => ({ meta: [{ title: "Medicine Reminder — MedSetu" }] }),
  component: MedsPage,
});

interface Medicine {
  id: string; name: string; dosage: string | null;
  times: string[]; days: number[]; active: boolean;
}

function MedsPage() {
  const { t } = useLang();
  const [list, setList] = useState<Medicine[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [dosage, setDosage] = useState(""); const [times, setTimes] = useState("08:00, 20:00");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied");

  const load = async () => {
    const { data } = await supabase.from("medicines").select("id,name,dosage,times,days,active").eq("active", true).order("created_at", { ascending: false });
    setList((data as Medicine[] | null) ?? []);
  };
  useEffect(() => { void load(); }, []);

  // Reminder polling — checks every 30 s while tab is open
  useEffect(() => {
    if (notifPerm !== "granted") return;
    let lastFired: Record<string, string> = JSON.parse(localStorage.getItem("medsetu_lastFired") || "{}");
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0"); const mm = String(now.getMinutes()).padStart(2, "0");
      const cur = `${hh}:${mm}`;
      const key = `${now.toDateString()}|${cur}`;
      for (const m of list) {
        if (!m.times.includes(cur)) continue;
        const fk = `${m.id}|${key}`;
        if (lastFired[fk]) continue;
        try {
          new Notification("MedSetu reminder", { body: `${m.name}${m.dosage ? ` · ${m.dosage}` : ""}` });
        } catch (e) { /* ignore */ }
        lastFired[fk] = "1";
      }
      // GC old keys
      const todayPrefix = now.toDateString();
      lastFired = Object.fromEntries(Object.entries(lastFired).filter(([k]) => k.includes(todayPrefix)));
      localStorage.setItem("medsetu_lastFired", JSON.stringify(lastFired));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [list, notifPerm]);

  const askNotif = async () => {
    if (!("Notification" in window)) return toast.error("Notifications not supported");
    const p = await Notification.requestPermission();
    setNotifPerm(p);
    if (p === "granted") toast.success("Reminders enabled");
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = times.split(",").map((s) => s.trim()).filter((s) => /^\d{1,2}:\d{2}$/.test(s)).map((s) => {
      const [h, m] = s.split(":"); return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    });
    if (!name.trim() || t.length === 0) return toast.error("Provide name and at least one time (HH:MM)");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("medicines").insert({
      user_id: user.id, name: name.trim(), dosage: dosage.trim() || null, times: t,
    });
    if (error) return toast.error(error.message);
    setName(""); setDosage(""); setTimes("08:00, 20:00"); setAdding(false);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("medicines").update({ active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const taken = async (m: Medicine) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("medicine_logs").insert({ medicine_id: m.id, user_id: user.id, status: "taken" });
    toast.success(t.toString ? "Marked taken" : "Marked taken");
  };

  return (
    <AppShell title={t("medicines_title")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlarmClockCheck className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold">{t("medicines_title")}</h1>
        </div>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" />{t("add_medicine")}
        </button>
      </div>

      {notifPerm !== "granted" && (
        <button onClick={askNotif} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10">
          <Bell className="h-4 w-4" />{t("notifications_enable")}
        </button>
      )}

      {adding && (
        <form onSubmit={add} className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("medicine_name")} required maxLength={80}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder={t("dosage")} maxLength={80}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={times} onChange={(e) => setTimes(e.target.value)} placeholder={t("times_per_day")} maxLength={120}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("save")}</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">{t("cancel")}</button>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("no_medicines")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <AlarmClockCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.dosage ? `${m.dosage} · ` : ""}{m.times.join(", ")}</p>
              </div>
              <button onClick={() => void taken(m)} className="inline-flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-medium text-success-foreground">
                <Check className="h-3.5 w-3.5" />{t("mark_taken")}
              </button>
              <button onClick={() => void remove(m.id)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label={t("delete")}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
