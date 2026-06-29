import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES, type LangCode } from "@/lib/i18n/languages";
import { Loader2, Mail, KeyRound, Fingerprint } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MedSetu" },
      { name: "description", content: "Sign in to MedSetu with email, Google, or Aadhaar (demo)." },
    ],
  }),
  component: AuthPage,
});

type Mode = "menu" | "email" | "aadhaar";

function AuthPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState<Mode>("menu");

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session) {
        // Defer to avoid deadlocks
        setTimeout(() => navigate({ to: "/home", replace: true }), 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M</span>
            <span className="font-display text-lg font-semibold text-foreground">{t("app_name")}</span>
          </Link>
          <select
            value={lang}
            onChange={(e) => void setLang(e.target.value as LangCode)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            aria-label="Language"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
          </select>
        </div>

        <div className="mt-10">
          <h1 className="font-display text-3xl font-bold text-foreground">{t("welcome_title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("welcome_subtitle")}</p>
        </div>

        <div className="mt-8">
          {mode === "menu" && <MenuView onPick={setMode} />}
          {mode === "email" && <EmailView onBack={() => setMode("menu")} />}
          {mode === "aadhaar" && <AadhaarView onBack={() => setMode("menu")} />}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to our terms. AI guidance is not a substitute for a doctor.
        </p>
      </div>
    </div>
  );
}

function MenuView({ onPick }: { onPick: (m: Mode) => void }) {
  const { t } = useLang();
  const [busy, setBusy] = useState<string | null>(null);

  const google = async () => {
    setBusy("google");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setBusy(null);
      return;
    }
    if (result.redirected) return;
    // tokens already set
  };

  return (
    <div className="space-y-3">
      <button onClick={() => onPick("email")}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left font-medium shadow-sm transition hover:border-primary/40 hover:bg-secondary/40">
        <Mail className="h-5 w-5 text-primary" /> {t("continue_email")}
      </button>
      <button onClick={google} disabled={busy === "google"}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left font-medium shadow-sm transition hover:border-primary/40 hover:bg-secondary/40 disabled:opacity-60">
        {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
        {t("continue_google")}
      </button>
      <button onClick={() => onPick("aadhaar")}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left font-medium shadow-sm transition hover:border-primary/40 hover:bg-secondary/40">
        <Fingerprint className="h-5 w-5 text-accent" /> {t("continue_aadhaar")}
      </button>
    </div>
  );
}

function EmailView({ onBack }: { onBack: () => void }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← back</button>
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t("email")}
        autoComplete="email"
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
      <input
        type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder={t("password")}
        autoComplete={isSignup ? "new-password" : "current-password"}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
      <button type="submit" disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {isSignup ? t("sign_up") : t("sign_in")}
      </button>
      <button type="button" onClick={() => setIsSignup((v) => !v)}
        className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
        {isSignup ? "Have an account? Sign in" : "New here? Create account"}
      </button>
    </form>
  );
}

function AadhaarView({ onBack }: { onBack: () => void }) {
  const { t } = useLang();
  const [aadhaar, setAadhaar] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const cleaned = aadhaar.replace(/\D/g, "");
  const valid = cleaned.length === 12;

  const sendOtp = () => {
    if (!valid) return toast.error("Enter a 12-digit Aadhaar number");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setDemoOtp(code);
    setOtpSent(true);
    toast.success(`Demo OTP: ${code}`, { duration: 8000 });
  };

  const verify = async () => {
    if (otp !== demoOtp) return toast.error("Incorrect OTP");
    setBusy(true);
    try {
      // Synthesize a stable email-pass account from Aadhaar number (demo only)
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cleaned));
      const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
      const email = `aadhaar.${hex}@medsetu.demo`;
      const password = `Aadhaar!${hex.slice(0, 16)}`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { aadhaar_last4: cleaned.slice(-4) },
          },
        });
        if (signUpErr) throw signUpErr;
        const { error: again } = await supabase.auth.signInWithPassword({ email, password });
        if (again) throw again;
      }
      // Persist aadhaar last 4 on profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ aadhaar_last4: cleaned.slice(-4) }).eq("id", user.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← back</button>
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-foreground/80">
        {t("otp_demo_notice")}
      </div>
      <input
        inputMode="numeric" maxLength={14} placeholder={t("aadhaar_number")}
        value={aadhaar}
        onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim())}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm tracking-widest focus:border-primary focus:outline-none"
        disabled={otpSent}
      />
      {!otpSent ? (
        <button type="button" onClick={sendOtp} disabled={!valid}
          className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {t("send_otp")}
        </button>
      ) : (
        <>
          <input
            inputMode="numeric" maxLength={6} placeholder={t("enter_otp")}
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-lg tracking-[0.5em] focus:border-primary focus:outline-none"
          />
          <button type="button" onClick={verify} disabled={busy || otp.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("verify_otp")}
          </button>
        </>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.75 3.28-8.07z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.4c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.33 9.14 5.4 12 5.4z" />
    </svg>
  );
}
