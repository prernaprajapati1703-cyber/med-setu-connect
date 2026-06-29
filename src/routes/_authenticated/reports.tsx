import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeReport } from "@/lib/reports.functions";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { FileText, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Report Analyzer — MedSetu" }] }),
  component: ReportsPage,
});

interface Result {
  summary: string;
  key_terms: { term: string; meaning: string }[];
  red_flags: string[];
}

async function fileToBase64(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

function ReportsPage() {
  const { t, lang } = useLang();
  const analyze = useServerFn(analyzeReport);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [filename, setFilename] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) return toast.error("File must be under 10 MB");
    setBusy(true); setResult(null); setFilename(f.name);
    try {
      const b64 = await fileToBase64(f);
      const r = await analyze({ data: { fileBase64: b64, mime: f.type || "application/pdf", filename: f.name, language: lang } });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t("reports_title")}>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <h1 className="font-display text-lg font-semibold">{t("reports_title")}</h1>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-10 text-center transition hover:bg-primary/10 disabled:opacity-60">
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
          <span className="text-sm font-medium">{busy ? t("analyzing") : t("reports_drop")}</span>
          <span className="text-xs text-muted-foreground">JPG, PNG, or PDF · up to 10 MB</span>
        </button>
        <input
          ref={inputRef} type="file" hidden accept="image/*,application/pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
        />
        {filename && <p className="mt-2 text-xs text-muted-foreground truncate">{filename}</p>}
      </div>

      {result && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("reports_explain")}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{result.summary}</p>
          </div>

          {result.red_flags?.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-destructive">Important</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                {result.red_flags.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {result.key_terms?.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("reports_terms")}</p>
              <dl className="mt-2 space-y-2 text-sm">
                {result.key_terms.map((k, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                    <dt className="font-semibold">{k.term}</dt>
                    <dd className="text-foreground/80">{k.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
