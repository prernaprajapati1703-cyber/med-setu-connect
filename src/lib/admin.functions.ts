import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (error) return false;
    return Boolean(data);
  });

export const grantSelfAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // DEMO helper — promotes the current user to admin so the demo dashboard is reachable.
    // For real use, restrict via env flag or signed seed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [symptomsRes, alertsRes] = await Promise.all([
      supabaseAdmin.from("symptoms")
        .select("condition,severity,region,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabaseAdmin.from("emergency_alerts")
        .select("id,lat,lng,message,language,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const symptoms = symptomsRes.data ?? [];

    // Top conditions
    const conditionCounts = new Map<string, number>();
    const severityCounts = { low: 0, medium: 0, high: 0 } as Record<string, number>;
    const regionCounts = new Map<string, number>();
    for (const s of symptoms) {
      if (s.condition) conditionCounts.set(s.condition, (conditionCounts.get(s.condition) ?? 0) + 1);
      if (s.severity) severityCounts[s.severity] = (severityCounts[s.severity] ?? 0) + 1;
      if (s.region) regionCounts.set(s.region, (regionCounts.get(s.region) ?? 0) + 1);
    }
    const topConditions = Array.from(conditionCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const hotspots = Array.from(regionCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return {
      totalCases: symptoms.length,
      topConditions,
      severityCounts,
      hotspots,
      alerts: alertsRes.data ?? [],
    };
  });
