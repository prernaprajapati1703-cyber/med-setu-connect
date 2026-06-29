import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Stethoscope, FileText, MapPin, AlarmClockCheck, Siren, User } from "lucide-react";
import type { ReactNode } from "react";

interface Props { children: ReactNode; title?: ReactNode; }

const NAV = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/triage", label: "Triage", Icon: Stethoscope },
  { to: "/sos", label: "SOS", Icon: Siren },
  { to: "/medicines", label: "Meds", Icon: AlarmClockCheck },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function AppShell({ children, title }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M</span>
            <span className="font-display font-semibold text-foreground">MedSetu</span>
          </Link>
          {title ? <div className="text-sm font-medium text-foreground/70">{title}</div> : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-5xl items-center justify-around">
          {NAV.map(({ to, label, Icon }) => {
            const active = pathname === to;
            const isSos = to === "/sos";
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${
                    isSos ? "bg-destructive text-destructive-foreground shadow-md" :
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
