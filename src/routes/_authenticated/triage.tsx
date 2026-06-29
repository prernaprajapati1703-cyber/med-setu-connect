import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { triageSymptoms } from "@/lib/triage.functions";
import { AppShell } from "@/components/AppShell";
import { SeverityBadge } from "@/components/SeverityBadge";
import { VoiceButton } from "@/components/VoiceButton";
import { SpeakButton } from "@/components/SpeakButton";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Loader2, Send, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/triage")({
  head: () => ({ meta: [{ title: "AI Symptom Triage — MedSetu" }] }),
  component: TriagePage,
});

interface Result {
  condition: string;
  severity: "low" | "medium" | "high";
  specialist: string;
  precautions: string[];
  explanation: string;
}

function TriagePage() {
  const { t, lang } = useLang();
  const triage = useServerFn(triageSymptoms);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (text.trim().length < 5) return toast.error("Please describe symptoms");
    setBusy(true);
    setResult(null);
    try {
      const r = await triage({ data: { text: text.trim(), language: lang } });
      setResult({
        condition: r.condition, severity: r.severity, specialist: r.specialist,
        precautions: r.precautions ?? [], explanation: r.explanation,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  const readAloud = result ? `${result.condition}. ${result.explanation}. ${result.precautions.join(". ")}` : "";

  return (
    <AppShell title={t("triage_title")}>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold">{t("triage_title")}</h1>
        </div>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder={t("triage_placeholder")} rows={5} maxLength={2000}
          className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <VoiceButton onTranscript={(s) => setText((cur) => (cur ? cur + " " : "") + s)} disabled={busy} />
          <button onClick={run} disabled={busy || text.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? t("analyzing") : t("analyze")}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("triage_result")}</p>
              <h2 className="font-display text-xl font-bold">{result.condition}</h2>
            </div>
            <SeverityBadge level={result.severity} />
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">{result.explanation}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("see_specialist")}</p>
              <p className="mt-1 text-sm font-semibold">{result.specialist}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("precautions")}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                {result.precautions.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground">{t("triage_disclaimer")}</p>
            <SpeakButton text={readAloud} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
