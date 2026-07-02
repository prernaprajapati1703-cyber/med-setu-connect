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

export const seedDemoAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const conditions = [
      { c: "Viral fever", s: "low", sp: "General Physician" },
      { c: "Dengue", s: "high", sp: "Internal Medicine" },
      { c: "Migraine", s: "medium", sp: "Neurologist" },
      { c: "Common cold", s: "low", sp: "General Physician" },
      { c: "Gastroenteritis", s: "medium", sp: "Gastroenterologist" },
      { c: "Hypertension", s: "medium", sp: "Cardiologist" },
      { c: "Asthma flare-up", s: "high", sp: "Pulmonologist" },
      { c: "Type 2 Diabetes", s: "medium", sp: "Endocrinologist" },
      { c: "Skin allergy", s: "low", sp: "Dermatologist" },
      { c: "Chest pain", s: "high", sp: "Cardiologist" },
    ];
    const regions = ["Delhi", "Mumbai", "Bengaluru", "Kolkata", "Chennai", "Hyderabad", "Pune", "Jaipur", "Lucknow", "Ahmedabad"];
    const langs = ["en", "hi", "ta", "bn", "mr"];

    const rows = Array.from({ length: 60 }, () => {
      const cond = conditions[Math.floor(Math.random() * conditions.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const lang = langs[Math.floor(Math.random() * langs.length)];
      const daysAgo = Math.floor(Math.random() * 21);
      return {
        user_id: context.userId,
        input_text: `Demo case: ${cond.c.toLowerCase()} in ${region}`,
        language: lang,
        condition: cond.c,
        severity: cond.s,
        specialist: cond.sp,
        region,
        precautions: ["Rest", "Hydration", "Consult doctor"],
        ai_response: { demo: true },
        created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      };
    });
    await supabaseAdmin.from("symptoms").insert(rows);

    const alerts = Array.from({ length: 6 }, (_, i) => ({
      user_id: context.userId,
      lat: 28.6 + Math.random() * 0.4,
      lng: 77.1 + Math.random() * 0.4,
      message: "Demo SOS alert — please assist",
      language: "en",
      status: i < 2 ? "active" : "resolved",
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }));
    await supabaseAdmin.from("emergency_alerts").insert(alerts);

    return { ok: true, inserted: rows.length, alerts: alerts.length };
  });

export const clearDemoAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("symptoms").delete().eq("user_id", context.userId).contains("ai_response", { demo: true });
    await supabaseAdmin.from("emergency_alerts").delete().eq("user_id", context.userId).eq("message", "Demo SOS alert — please assist");
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
