import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Stethoscope, FileText, MapPin, Siren, AlarmClockCheck, ShieldCheck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — MedSetu" }] }),
  component: Home,
});

function Home() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("display_name, preferred_language").eq("id", user.id).maybeSingle();
      if (!mounted) return;
      if (!data || !data.display_name) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      setName(data.display_name);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const cards = [
    { to: "/triage", title: t("feat_triage"), sub: t("feat_triage_sub"), Icon: Stethoscope, tone: "bg-primary/10 text-primary" },
    { to: "/reports", title: t("feat_reports"), sub: t("feat_reports_sub"), Icon: FileText, tone: "bg-accent/10 text-accent" },
    { to: "/hospitals", title: t("feat_hospitals"), sub: t("feat_hospitals_sub"), Icon: MapPin, tone: "bg-warning/15 text-warning-foreground" },
    { to: "/sos", title: t("feat_sos"), sub: t("feat_sos_sub"), Icon: Siren, tone: "bg-destructive/10 text-destructive" },
    { to: "/medicines", title: t("feat_medicines"), sub: t("feat_medicines_sub"), Icon: AlarmClockCheck, tone: "bg-primary/10 text-primary" },
    { to: "/admin", title: t("feat_admin"), sub: "Hotspots & analytics", Icon: ShieldCheck, tone: "bg-secondary text-secondary-foreground" },
  ] as const;

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-sm text-muted-foreground">{t("home_greeting")}{name ? `, ${name}` : ""} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{t("home_subtitle")}</h1>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(({ to, title, sub, Icon, tone }) => (
          <Link key={to} to={to}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{sub}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium text-foreground">Health tip</p>
        <p className="mt-1 text-sm text-muted-foreground">Stay hydrated and seek medical care for severe or persistent symptoms — MedSetu is a guide, not a doctor.</p>
      </section>
    </AppShell>
  );
}
