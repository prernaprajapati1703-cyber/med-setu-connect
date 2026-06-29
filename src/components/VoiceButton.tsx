import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { transcribeAudio } from "@/lib/voice.functions";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Encode Float32 PCM samples into a WAV blob (16-bit mono).
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function VoiceButton({ onTranscript, disabled }: Props) {
  const { lang, t } = useLang();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const transcribe = useServerFn(transcribeAudio);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination);
      setRecording(true);
    } catch (e) {
      toast.error("Microphone permission denied");
    }
  };

  const stop = async () => {
    setRecording(false);
    const ctx = ctxRef.current;
    const node = nodeRef.current;
    const source = sourceRef.current;
    const stream = streamRef.current;
    try {
      node?.disconnect(); source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      const sampleRate = ctx?.sampleRate ?? 44100;
      const total = chunksRef.current.reduce((n, c) => n + c.length, 0);
      const merged = new Float32Array(total);
      let off = 0;
      for (const c of chunksRef.current) { merged.set(c, off); off += c.length; }
      await ctx?.close();
      if (merged.length < sampleRate * 0.3) {
        toast.error("Recording too short");
        return;
      }
      const blob = encodeWav(merged, sampleRate);
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(bin);
      setBusy(true);
      const { text } = await transcribe({ data: { audioBase64, mime: "audio/wav", language: lang } });
      if (text) onTranscript(text);
      else toast.error("No speech detected");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setBusy(false);
      chunksRef.current = [];
      ctxRef.current = null; nodeRef.current = null; sourceRef.current = null; streamRef.current = null;
    }
  };

  const onClick = () => recording ? void stop() : void start();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={recording ? t("stop") : t("speak")}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition shadow-sm
        ${recording ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"}
        disabled:opacity-50`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {busy ? t("loading") : recording ? t("stop") : t("speak")}
    </button>
  );
}
