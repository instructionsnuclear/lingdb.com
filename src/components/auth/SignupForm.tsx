"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validators/auth";
import OAuthButton from "./OAuthButton";
import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import SlideCaptcha from "@/components/ui/SlideCaptcha";

export default function SignupForm({ locale = "en" }: { locale?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [captchaDuration, setCaptchaDuration] = useState<number>(0);
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate with Zod
    const result = signupSchema.safeParse({
      email,
      password,
      captchaDuration,
      honeypot,
    });
    if (!result.success) {
      const issue = result.error.issues[0];

      // Specifically handle honeypot - if filled (bot detected), we silent fail or return generic error
      if (issue.path.includes("honeypot")) {
        setError("Registration failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Specifically handle captchaDuration error first
      if (issue.path.includes("captchaDuration")) {
        setError(t("errors.captcha_failed"));
        setIsLoading(false);
        setIsVerified(false);
        setCaptchaDuration(0);
        return;
      }

      // Safely check properties for narrowing
      if ("validation" in issue && issue.validation === "email") {
        setError(t("errors.invalid_email"));
      } else if ("minimum" in issue && issue.minimum === 6) {
        setError(t("errors.password_min"));
      } else {
        setError(issue.message);
      }
      setIsLoading(false);
      return;
    }

    try {
      const { signUp } = await import("@/actions/auth");
      const registerResult = await signUp(
        email,
        password,
        captchaDuration,
        honeypot,
        locale,
      );

      if (!registerResult.success) {
        setError(registerResult.error || t("errors.signup_failed"));
        setIsLoading(false);
        return;
      }

      // Auto-login upon successful account creation
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(tCommon("errors.generic"));
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("signup_title")}
        </h1>
        <p className="mt-1 text-lg text-[var(--fg)]/60">
          {t("signup_subtitle")}
        </p>
      </div>

      <OAuthButton provider="google" redirectTo={`/${locale}/dashboard`} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border-color)]" />
        </div>
        <div className="relative flex justify-center text-sm uppercase">
          <span className="bg-[var(--bg)] px-2 text-[var(--fg)]/40">
            {t("or")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-lg text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Honeypot field (hidden from humans) - Using common name to attract bots */}
        <div style={{ display: "none" }} aria-hidden="true">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-lg font-medium">
            {t("email_label")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg)]/40" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email_placeholder")}
              required
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] py-3 pl-10 pr-4 text-lg transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-lg font-medium">
            {t("password_label")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg)]/40" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password_placeholder_signup")}
              required
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] py-3 pl-10 pr-12 text-lg transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg)]/40 hover:text-[var(--fg)]/70"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-sm text-[var(--fg)]/40">
            {t("errors.password_hint")}
          </p>
        </div>

        <div className="pt-2">
          <SlideCaptcha
            key={isVerified ? "verified" : "unverified"}
            onVerify={({ verified, duration }) => {
              setIsVerified(verified);
              setCaptchaDuration(duration);
            }}
            text={t("slide_to_verify")}
            successText={t("verified")}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !isVerified}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-lg font-semibold text-white transition-all duration-200 hover:bg-primary-600 hover:shadow-lg active:scale-[0.98]",
            (isLoading || !isVerified) && "cursor-not-allowed opacity-70",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("creating_account")}
            </>
          ) : (
            t("signup_btn")
          )}
        </button>
      </form>

      <p className="text-center text-lg text-[var(--fg)]/60">
        {t("have_account")}{" "}
        <Link
          href={`/${locale}/login`}
          className="font-medium text-primary-500 hover:text-primary-600 hover:underline"
        >
          {tCommon("login")}
        </Link>
      </p>
    </div>
  );
}
