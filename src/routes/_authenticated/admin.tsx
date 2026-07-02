import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminAnalytics, isAdmin, seedDemoAnalytics, clearDemoAnalytics } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { ShieldCheck, AlertTriangle, MapPin, Activity, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Government Dashboard — MedSetu" }] }),
  component: AdminPage,
});

interface Analytics {
  totalCases: number;
  topConditions: { name: string; count: number }[];
  severityCounts: { low: number; medium: number; high: number };
  hotspots: { name: string; count: number }[];
  alerts: { id: string; lat: number | null; lng: number | null; message: string; status: string; created_at: string }[];
}

const SEVERITY_COLORS = { low: "#10B981", medium: "#F59E0B", high: "#EF4444" };

function AdminPage() {
  const { t } = useLang();
  const checkAdmin = useServerFn(isAdmin);
  const fetchAnalytics = useServerFn(adminAnalytics);
  const seed = useServerFn(seedDemoAnalytics);
  const clearDemo = useServerFn(clearDemoAnalytics);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const ok = await checkAdmin({});
    setAllowed(ok);
    if (!ok) return;
    try {
      const a = await fetchAnalytics({});
      setData(a as unknown as Analytics);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { void load(); }, []);

  // Realtime alert feed
  useEffect(() => {
    if (!allowed) return;
    const ch = supabase.channel("admin-alerts").on("postgres_changes", {
      event: "INSERT", schema: "public", table: "emergency_alerts",
    }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [allowed]);

  if (allowed === null) {
    return <AppShell><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("loading")}</div></AppShell>;
  }
  if (!allowed) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning-foreground" /><h1 className="font-display text-lg font-semibold">{t("admin_only")}</h1></div>
          <p className="mt-2 text-sm text-muted-foreground">Go to your Profile and tap "Enable Admin Dashboard (demo)" to grant yourself admin access for the demo.</p>
        </div>
      </AppShell>
    );
  }
  if (!data) {
    return <AppShell><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("loading")}</div></AppShell>;
  }

  const severityData = (["low", "medium", "high"] as const).map((k) => ({ name: t(`severity_${k}` as "severity_low") , value: data.severityCounts[k], key: k }));

  return (
    <AppShell title={t("admin_title")}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <h1 className="font-display text-lg font-semibold">{t("admin_title")}</h1>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total cases" value={data.totalCases} Icon={Activity} />
        <StatCard label="High severity" value={data.severityCounts.high} Icon={AlertTriangle} tone="text-destructive" />
        <StatCard label="Hotspots" value={data.hotspots.length} Icon={MapPin} />
        <StatCard label="Active SOS" value={data.alerts.filter((a) => a.status === "active").length} Icon={AlertTriangle} tone="text-destructive" />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-base font-semibold">{t("top_conditions")}</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topConditions} layout="vertical" margin={{ left: 12, right: 12 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0A6CB8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-base font-semibold">{t("severity_dist")}</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {severityData.map((s) => <Cell key={s.key} fill={SEVERITY_COLORS[s.key]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-base font-semibold">{t("hotspots")}</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.hotspots.length === 0 && <li className="text-muted-foreground">No region data yet.</li>}
            {data.hotspots.map((h) => (
              <li key={h.name} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" />{h.name}</span>
                <span className="font-semibold">{h.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-base font-semibold">{t("live_emergencies")}</h2>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-auto text-sm">
            {data.alerts.length === 0 && <li className="text-muted-foreground">No alerts yet.</li>}
            {data.alerts.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <p className="truncate font-medium">{a.message}</p>
                {a.lat != null && a.lng != null && (
                  <a className="text-xs text-primary hover:underline" target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}>
                    {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({ label, value, Icon, tone }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }>; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className={`flex items-center gap-2 text-xs ${tone ?? "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" /><span>{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
