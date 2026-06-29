import { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeSpeech } from "@/lib/voice.functions";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";

export function SpeakButton({ text }: { text: string }) {
  const { lang, t } = useLang();
  const [busy, setBusy] = useState(false);
  const tts = useServerFn(synthesizeSpeech);

  const play = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { audioBase64, mime } = await tts({ data: { text, language: lang } });
      const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes as BlobPart], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Playback failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={play}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-secondary disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
      {t("listen")}
    </button>
  );
}
