"use client";

import { useMemo, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/utils/constants";
import { createWordleGame } from "@/lib/api/wordle.api";
import {
  ArrowLeft,
  ArrowRight,
  Puzzle,
  Eye,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Globe2,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Minus,
  RefreshCw,
  Trophy,
} from "lucide-react";

type CreateResponse = {
  gameId: string;
  sharePath: string;
  shareUrl: string;
};

const languagesList: { code: SupportedLocale; flag: string; label: string }[] = [
  { code: "en", flag: "gb", label: "English" },
  { code: "tr", flag: "tr", label: "Türkçe" },
  { code: "de", flag: "de", label: "Deutsch" },
  { code: "fr", flag: "fr", label: "Français" },
  { code: "es", flag: "es", label: "Español" },
];

function onlyLetters(value: string) {
  return value.replace(/[^\p{L}]/gu, "");
}

export default function WordleCreator({ locale }: { locale: string }) {
  const t = useTranslations("wordle");
  const tCommon = useTranslations("common");
  const tLanguages = useTranslations("settings.languages");

  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const successCardRef = useRef<HTMLDivElement>(null);

  const [language, setLanguage] = useState<SupportedLocale>(() => {
    const normalizedLocale = locale.toLowerCase();
    return SUPPORTED_LOCALES.includes(normalizedLocale as SupportedLocale)
      ? (normalizedLocale as SupportedLocale)
      : "en";
  });

  const [maxTries, setMaxTries] = useState(6);
  const [word, setWord] = useState("");
  const [noteToSolver, setNoteToSolver] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createGameMutation = useMutation({
    mutationFn: createWordleGame,
  });

  const normalizedWord = useMemo(() => {
    try {
      return word.trim().toLocaleUpperCase(language);
    } catch {
      return word.trim().toUpperCase();
    }
  }, [word, language]);

  const isWordValid = normalizedWord.length >= 3 && normalizedWord.length <= 12;
  const isLengthInvalid =
    normalizedWord.length > 0 &&
    (normalizedWord.length < 3 || normalizedWord.length > 12);

  useGSAP(
    () => {
      gsap.fromTo(
        ".creator-hero",
        { opacity: 0, y: -25 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
    },
    { scope: containerRef }
  );

  async function handleCreateGame(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (normalizedWord.length < 3 || normalizedWord.length > 12) {
      setError(t("errors.word_length_range"));
      return;
    }

    if (!/^\p{L}+$/u.test(normalizedWord)) {
      setError(t("errors.word_letters_only"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = (await createGameMutation.mutateAsync({
        locale,
        language,
        word: normalizedWord,
        noteToSolver,
        maxTries,
      })) as CreateResponse;
      setShareUrl(payload.shareUrl);
      setSharePath(payload.sharePath);

      // Smooth scroll or pop success card
      setTimeout(() => {
        if (successCardRef.current) {
          gsap.fromTo(
            successCardRef.current,
            { scale: 0.85, opacity: 0, y: 20 },
            { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }
          );
        }
      }, 50);
    } catch {
      setError(t("errors.create_failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  const handleResetForm = () => {
    setWord("");
    setNoteToSolver("");
    setShareUrl(null);
    setSharePath(null);
    setError(null);
  };

  const lettersArray = normalizedWord.split("");
  const dummyTiles = Array.from({ length: Math.max(5, Math.min(lettersArray.length, 12)) });

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[calc(100vh-4rem)] flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#ff4d4f] via-[#e03131] to-[#991b1b] text-white p-4 sm:p-6 md:p-10 select-none"
    >
      {/* Ambient background glow & retro dot matrix */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.35),transparent_65%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col h-full justify-between gap-6 sm:gap-8">
        {/* ─── TOP BAR ───────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between">
          <Link
            href={`/${locale}/wordle`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-sm hover:bg-white/30 hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("back_to_wordle")}</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400 text-slate-950 text-xs sm:text-sm font-black tracking-wide uppercase shadow-lg">
            <Puzzle className="w-4 h-4 text-slate-950" />
            <span>{t("title")}</span>
          </div>
        </div>

        {/* ─── HERO TITLE ────────────────────────────────────────── */}
        <div className="creator-hero text-center flex flex-col items-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight drop-shadow-md">
            {t("title")}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-white/90 font-medium max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* ─── SUCCESS CELEBRATION MODAL CARD (AFTER CREATION) ──── */}
        {shareUrl && sharePath ? (
          <div
            ref={successCardRef}
            className="w-full rounded-3xl bg-white text-slate-950 p-6 sm:p-10 shadow-[0_15px_0_rgba(0,0,0,0.2),0_30px_60px_rgba(0,0,0,0.4)] border-4 border-yellow-400 flex flex-col items-center text-center my-auto"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl font-black mb-4 shadow-inner animate-bounce">
              🎉
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
              {t("puzzle_ready")}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium max-w-md">
              {t("puzzle_ready_desc")}
            </p>

            {/* Secret word preview banner */}
            <div className="my-5 flex items-center justify-center gap-2">
              {normalizedWord.split("").map((ch, i) => (
                <div
                  key={i}
                  className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl bg-[#2f9e44] border-2 border-[#40c057] text-white text-xl sm:text-2xl font-black flex items-center justify-center shadow-lg"
                >
                  {ch}
                </div>
              ))}
            </div>

            {/* Share Link Box with One-Click Copy */}
            <div className="w-full max-w-lg p-3 sm:p-4 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-between gap-3 mb-6">
              <span className="text-xs sm:text-sm font-bold text-slate-700 truncate select-all">
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`cursor-pointer flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 shadow-md ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-yellow-400 hover:bg-yellow-300 text-slate-950"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t("copied_success")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t("share.copy")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <Link
                href={sharePath}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-base uppercase tracking-wider shadow-xl hover:scale-103 active:scale-95 transition-all"
              >
                <span>{t("play_now")}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handleResetForm}
                className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-base transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t("create_another")}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ─── MAIN INTERACTIVE BUILDER FORM ─────────────────────── */
          <form
            onSubmit={handleCreateGame}
            className="w-full flex flex-col gap-6"
          >
            {/* 1. LIVE INTERACTIVE 3D LETTER TILES PREVIEW */}
            <div className="w-full p-6 sm:p-8 rounded-3xl bg-black/25 backdrop-blur-xl border-3 border-white/20 shadow-2xl flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-yellow-300">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t("live_preview")}</span>
                </span>
                <span className="text-white/40">•</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isWordValid
                      ? "bg-green-500/30 text-green-200 border border-green-400/40"
                      : "bg-black/30 text-white/70"
                  }`}
                >
                  {normalizedWord.length} / 12 Harf
                </span>
              </div>

              {/* Dynamic 3D Letter Tiles Strip */}
              <div
                ref={previewRef}
                className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 min-h-[58px] sm:min-h-[72px]"
              >
                {lettersArray.length > 0
                  ? lettersArray.map((letter, idx) => (
                      <div
                        key={idx}
                        className="w-11 h-13 sm:w-14 sm:h-16 rounded-xl sm:rounded-2xl bg-[#2f9e44] border-2 sm:border-3 border-[#40c057] text-white flex items-center justify-center text-2xl sm:text-4xl font-black shadow-xl animate-pop transition-transform"
                      >
                        {letter}
                      </div>
                    ))
                  : dummyTiles.map((_, idx) => (
                      <div
                        key={idx}
                        className="w-11 h-13 sm:w-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white/10 border-2 border-dashed border-white/30 text-white/40 flex items-center justify-center text-xl sm:text-2xl font-black animate-pulse"
                      >
                        ?
                      </div>
                    ))}
              </div>

              {/* Large Arcade Secret Word Input */}
              <div className="w-full max-w-xl mt-6">
                <input
                  type="text"
                  value={word}
                  onChange={(e) =>
                    setWord(onlyLetters(e.target.value).toLocaleUpperCase(language))
                  }
                  maxLength={12}
                  className="w-full text-center text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.2em] bg-black/40 border-3 border-white/30 focus:border-yellow-400 focus:bg-black/55 text-white placeholder-white/30 rounded-2xl sm:rounded-3xl py-3.5 sm:py-5 px-4 outline-none shadow-inner transition-all"
                  placeholder={t("fields.word_placeholder")}
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mt-2 px-2">
                  <span className="text-white/80">{t("fields.word_hint")}</span>
                  {isLengthInvalid && (
                    <span className="text-yellow-300 font-bold">
                      {t("errors.word_length_range")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SETTINGS GRID: LANGUAGE & ATTEMPTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Language Selection Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-black/20 backdrop-blur-md border-2 border-white/15 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <Globe2 className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-black uppercase tracking-wider">
                    {tCommon("language")}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {languagesList.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`cursor-pointer p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                          isSelected
                            ? "bg-yellow-400 text-slate-950 font-black shadow-lg scale-105"
                            : "bg-white/10 hover:bg-white/20 text-white font-bold"
                        }`}
                      >
                        <span className={`fi fi-${lang.flag} text-xl rounded`} />
                        <span className="text-xs uppercase">{lang.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attempts Stepper Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-black/20 backdrop-blur-md border-2 border-white/15 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-black uppercase tracking-wider">
                    🎯 {t("tries_label")}
                  </span>
                  <span className="text-xs text-white/70">
                    {t("fields.max_tries_hint")}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMaxTries((prev) => Math.max(1, prev - 1))}
                    className="cursor-pointer w-12 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-xl font-black transition-all shadow"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex-1 text-center py-2 rounded-xl bg-black/30 border border-white/20">
                    <span className="text-3xl font-black text-yellow-300">
                      {maxTries}
                    </span>
                    <span className="text-xs uppercase font-bold text-white/80 block">
                      {t("tries_label")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMaxTries((prev) => Math.min(10, prev + 1))}
                    className="cursor-pointer w-12 h-12 rounded-xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-xl font-black transition-all shadow"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. OPTIONAL CLUE / NOTE TO SOLVER */}
            <div className="p-5 sm:p-6 rounded-3xl bg-black/20 backdrop-blur-md border-2 border-white/15">
              <label className="flex items-center gap-2 text-sm font-black uppercase tracking-wider mb-2">
                <MessageSquare className="w-4 h-4 text-yellow-300" />
                <span>{t("fields.note_to_solver")}</span>
              </label>
              <textarea
                value={noteToSolver}
                onChange={(e) => setNoteToSolver(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full bg-black/30 border-2 border-white/20 focus:border-yellow-400 focus:bg-black/40 text-white placeholder-white/40 rounded-2xl p-3 sm:p-4 text-base font-medium outline-none transition-all resize-none shadow-inner"
                placeholder={t("fields.note_placeholder")}
              />
              <p className="mt-1.5 text-xs text-white/70">
                {t("fields.note_hint")}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-4 rounded-2xl bg-black/50 border-2 border-red-400 text-red-200 text-center font-bold text-sm animate-shake">
                {error}
              </div>
            )}

            {/* 4. GIANT BOUNCY SUBMIT BUTTON */}
            <div className="flex justify-center pt-2 pb-4">
              <button
                type="submit"
                disabled={isSubmitting || !isWordValid}
                className="cursor-pointer w-full sm:w-auto min-w-[280px] px-10 py-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 font-black text-xl sm:text-2xl uppercase tracking-wider shadow-[0_8px_0_#b45309,0_20px_35px_rgba(245,158,11,0.4)] hover:brightness-105 hover:-translate-y-1 active:translate-y-2 active:shadow-[0_2px_0_#b45309] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>{t("creating")}</span>
                  </>
                ) : (
                  <>
                    <Puzzle className="w-6 h-6" />
                    <span>{t("create_button")}</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
