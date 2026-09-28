"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/utils/constants";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Loader2,
  Puzzle,
  Globe2,
  Flame,
  CheckCircle2,
} from "lucide-react";

const languagesList: { code: SupportedLocale; flag: string; labelKey: string }[] = [
  { code: "en", flag: "gb", labelKey: "English" },
  { code: "tr", flag: "tr", labelKey: "Türkçe" },
  { code: "de", flag: "de", labelKey: "Deutsch" },
  { code: "fr", flag: "fr", labelKey: "Français" },
  { code: "es", flag: "es", labelKey: "Español" },
];

export default function WordleSelector({ locale }: { locale: string }) {
  const t = useTranslations("wordle");
  const tLanguages = useTranslations("settings.languages");
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const tilesRowRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLocale>(() => {
    const normalizedLocale = locale.toLowerCase();
    return SUPPORTED_LOCALES.includes(normalizedLocale as SupportedLocale)
      ? (normalizedLocale as SupportedLocale)
      : "en";
  });

  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useGSAP(
    () => {
      // Hero entrance
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
      );

      // Stagger bounce for YORDLE letter tiles
      if (tilesRowRef.current) {
        gsap.fromTo(
          tilesRowRef.current.children,
          { scale: 0, rotate: -20, opacity: 0 },
          {
            scale: 1,
            rotate: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.07,
            ease: "back.out(2)",
            delay: 0.15,
          }
        );
      }

      // Action cards pop in
      if (cardsRef.current) {
        gsap.fromTo(
          cardsRef.current.children,
          { opacity: 0, y: 30, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out",
            delay: 0.3,
          }
        );
      }
    },
    { scope: containerRef }
  );

  async function handlePlayRandom() {
    setIsLoadingGame(true);
    setError(null);
    try {
      const response = await fetch(`/api/wordle/random?language=${selectedLanguage}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load game");
      }
      router.push(`/${locale}/wordle/game/${data.gameId}`);
    } catch (err: any) {
      setError(err.message || "Failed to fetch a random game. Please try again.");
      setIsLoadingGame(false);
    }
  }

  const wordleHeaderLetters = [
    { char: "Y", bg: "bg-[#2f9e44]", border: "border-[#40c057]", text: "text-white" },
    { char: "O", bg: "bg-[#f59f00]", border: "border-[#ffd43b]", text: "text-slate-950" },
    { char: "R", bg: "bg-[#2f9e44]", border: "border-[#40c057]", text: "text-white" },
    { char: "D", bg: "bg-[#212529]", border: "border-[#495057]", text: "text-white" },
    { char: "L", bg: "bg-[#f59f00]", border: "border-[#ffd43b]", text: "text-slate-950" },
    { char: "E", bg: "bg-[#2f9e44]", border: "border-[#40c057]", text: "text-white" },
  ];

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[calc(100vh-4rem)] flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#ff4d4f] via-[#e03131] to-[#a61e1e] text-white p-4 sm:p-6 md:p-10 select-none"
    >
      {/* Ambient background glows & retro dot matrix */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.3),transparent_65%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Floating background decorative letter tiles */}
      <div className="absolute -left-8 top-16 -rotate-12 select-none opacity-15 pointer-events-none hidden lg:block">
        <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-5xl font-black text-white shadow-2xl">
          W
        </div>
      </div>
      <div className="absolute -right-8 top-28 rotate-12 select-none opacity-15 pointer-events-none hidden lg:block">
        <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-6xl font-black text-white shadow-2xl">
          ?
        </div>
      </div>
      <div className="absolute left-12 bottom-12 rotate-6 select-none opacity-10 pointer-events-none hidden lg:block">
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
          ★
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col h-full justify-between gap-6 sm:gap-8">
        {/* ─── TOP BAR (BACK LINK & ARCADE BADGE) ────────────────── */}
        <div className="w-full flex items-center justify-between">
          <Link
            href={`/${locale}/games`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-sm hover:bg-white/30 hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("back_to_games")}</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-yellow-300 text-xs sm:text-sm font-bold tracking-wide uppercase shadow-lg">
            <Flame className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span>{t("play_title")}</span>
          </div>
        </div>

        {/* ─── HERO SECTION WITH 3D LETTER TILES ──────────────────── */}
        <div ref={heroRef} className="flex flex-col items-center text-center">
          {/* Animated 3D Wordle Header Tiles */}
          <div
            ref={tilesRowRef}
            className="flex items-center gap-1.5 sm:gap-3 my-2"
          >
            {wordleHeaderLetters.map((tile, idx) => (
              <div
                key={idx}
                className={`w-11 h-12 sm:w-16 sm:h-18 md:w-20 md:h-22 rounded-xl sm:rounded-2xl ${tile.bg} border-2 sm:border-3 ${tile.border} ${tile.text} flex items-center justify-center text-2xl sm:text-4xl md:text-5xl font-black shadow-xl tracking-tight transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-default`}
              >
                {tile.char}
              </div>
            ))}
          </div>

          <h1 className="mt-3 text-3xl sm:text-5xl md:text-6xl font-black tracking-tight drop-shadow-md">
            {t("play_title")}
          </h1>
          <p className="mt-2 text-base sm:text-xl text-white/90 font-medium max-w-2xl px-2 leading-relaxed">
            {t("play_subtitle")}
          </p>
        </div>

        {/* ─── LANGUAGE PICKER DECK ─────────────────────────────── */}
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 mb-3 text-xs sm:text-sm font-bold tracking-wider uppercase text-white/90">
            <Globe2 className="w-4 h-4 text-yellow-300" />
            <span>{t("select_language")}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 w-full">
            {languagesList.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`group relative flex flex-col sm:flex-row items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 outline-none select-none text-center sm:text-left ${
                    isSelected
                      ? "border-yellow-400 bg-white/30 text-white shadow-2xl ring-4 ring-yellow-400/30 scale-105"
                      : "border-white/20 bg-white/10 text-white/90 hover:bg-white/20 hover:border-white/40 hover:scale-102 active:scale-95"
                  }`}
                >
                  <span
                    className={`fi fi-${lang.flag} text-2xl sm:text-3xl rounded shadow-md flex-shrink-0 transition-transform group-hover:scale-110`}
                  />
                  <span className="text-sm sm:text-base font-black tracking-tight">
                    {lang.labelKey}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-yellow-300 absolute top-2 right-2 hidden sm:block animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="max-w-2xl mx-auto w-full p-4 rounded-2xl bg-black/40 border-2 border-red-400 text-red-200 text-center font-bold text-sm sm:text-base animate-shake">
            {error}
          </div>
        )}

        {/* ─── ACTION LAUNCHER CARDS (BOUNCY 2-CARD DECK) ────────── */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl mx-auto"
        >
          {/* Card 1: Instant Random Game */}
          <div
            role="button"
            tabIndex={0}
            onClick={handlePlayRandom}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePlayRandom();
              }
            }}
            className="group/random cursor-pointer relative p-6 sm:p-8 rounded-3xl bg-white text-slate-950 shadow-[0_10px_0_rgba(0,0,0,0.2),0_20px_35px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_0_rgba(0,0,0,0.2),0_25px_45px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:translate-y-2 active:shadow-[0_2px_0_rgba(0,0,0,0.2)] transition-all duration-200 flex items-center justify-between overflow-hidden min-h-[140px] sm:min-h-[160px]"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none group-hover/random:scale-125 transition-transform">
              <Play className="w-28 h-28 fill-current text-slate-900" />
            </div>

            <div className="relative z-10 pr-4">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-2 group-hover/random:text-red-600 transition-colors">
                {t("instant_random_title")}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                {t("instant_random_desc")}
              </p>
            </div>

            <div className="relative z-10 flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/random:bg-yellow-400 group-hover/random:text-slate-950 group-hover/random:scale-110 transition-all">
              {isLoadingGame ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Play className="w-6 h-6 fill-current transition-transform group-hover/random:translate-x-0.5" />
              )}
            </div>

            {isLoadingGame && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center gap-3 text-red-600 font-black text-lg sm:text-xl rounded-3xl z-20">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>{t("fetching_game")}</span>
              </div>
            )}
          </div>

          {/* Card 2: Custom Wordle Builder */}
          <Link
            href={`/${locale}/wordle/create`}
            className="group/custom cursor-pointer relative p-6 sm:p-8 rounded-3xl bg-black/35 hover:bg-black/45 border-3 border-white/20 hover:border-yellow-300 text-white shadow-[0_10px_0_rgba(0,0,0,0.3),0_20px_35px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:translate-y-2 active:shadow-[0_2px_0_rgba(0,0,0,0.3)] transition-all duration-200 flex items-center justify-between overflow-hidden min-h-[140px] sm:min-h-[160px]"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none group-hover/custom:scale-125 transition-transform">
              <Puzzle className="w-28 h-28 text-yellow-300" />
            </div>

            <div className="relative z-10 pr-4">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 group-hover/custom:text-yellow-300 transition-colors">
                {t("create_custom_title")}
              </h2>
              <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed">
                {t("create_custom_desc")}
              </p>
            </div>

            <div className="relative z-10 flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center shadow-lg group-hover/custom:bg-white group-hover/custom:text-red-600 group-hover/custom:scale-110 transition-all">
              <ArrowRight className="w-6 h-6 transition-transform group-hover/custom:translate-x-0.5" />
            </div>
          </Link>
        </div>

        {/* ─── HOW WORDLE WORKS MINI-PREVIEW (FLUENT UX) ──────────── */}
        <div className="w-full max-w-2xl mx-auto py-3 px-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-white/90">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-md bg-[#2f9e44] text-white flex items-center justify-center font-black text-xs shadow">
              K
            </span>
            <span>{t("rule_correct")}</span>
          </div>
          <span className="text-white/40 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-md bg-[#f59f00] text-slate-950 flex items-center justify-center font-black text-xs shadow">
              E
            </span>
            <span>{t("rule_present")}</span>
          </div>
          <span className="text-white/40 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-md bg-[#212529] text-white flex items-center justify-center font-black text-xs shadow">
              L
            </span>
            <span>{t("rule_absent")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
