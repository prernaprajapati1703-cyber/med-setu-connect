import { useLang } from "@/lib/i18n/LanguageProvider";

export function SeverityBadge({ level }: { level: "low" | "medium" | "high" }) {
  const { t } = useLang();
  const map = {
    low: { label: t("severity_low"), cls: "bg-success/15 text-success border-success/30" },
    medium: { label: t("severity_medium"), cls: "bg-warning/15 text-warning-foreground border-warning/40" },
    high: { label: t("severity_high"), cls: "bg-destructive/15 text-destructive border-destructive/40" },
  } as const;
  const s = map[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
