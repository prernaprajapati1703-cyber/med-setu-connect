import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedSetu" },
      { name: "description", content: "AI Healthcare Bridge for India" },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) navigate({ to: "/home", replace: true });
      else navigate({ to: "/auth", replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary to-primary/70 text-primary-foreground">
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/15 backdrop-blur">
        <span className="font-display text-4xl font-bold">M</span>
      </div>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">MedSetu</h1>
        <p className="mt-1 text-sm opacity-90">AI Healthcare Bridge for India</p>
      </div>
      <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
      </div>
    </div>
  );
}
