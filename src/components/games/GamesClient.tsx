"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Gamepad2,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  Clock,
  Users2,
  Zap,
} from "lucide-react";

interface GamesClientProps {
  locale: string;
}

export default function GamesClient({ locale }: GamesClientProps) {
  const t = useTranslations("games");

  const containerRef = useRef<HTMLDivElement>(null);
  const yordleRef = useRef<HTMLAnchorElement>(null);
  const yabooRef = useRef<HTMLAnchorElement>(null);
  const yordleTilesRef = useRef<HTMLDivElement>(null);
  const yabooCardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Entrance animation for Yordle and Yaboo halves
      gsap.fromTo(
        yordleRef.current,
        { opacity: 0, y: -40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(
        yabooRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.1 }
      );

      // Bounce in letter tiles
      if (yordleTilesRef.current) {
        gsap.fromTo(
          yordleTilesRef.current.children,
          { scale: 0, rotate: -15, opacity: 0 },
          {
            scale: 1,
            rotate: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: "back.out(2)",
            delay: 0.25,
          }
        );
      }

      // Flip in Taboo preview card
      if (yabooCardRef.current) {
        gsap.fromTo(
          yabooCardRef.current,
          { scale: 0.8, rotateY: 30, opacity: 0 },
          {
            scale: 1,
            rotateY: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            delay: 0.35,
          }
        );
      }
    },
    { scope: containerRef }
  );


  const wordleLetters = [
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
      className="w-full min-h-[calc(100vh-4rem)] flex flex-col relative select-none overflow-hidden"
    >
      {/* ─── YORDLE GAME (TOP 50% VH - RED BACKGROUND) ─────────── */}
      <Link
        ref={yordleRef}
        href={`/${locale}/wordle`}
        id="game-yordle-card"
        aria-label="Play Yordle Wordle Game"
        className="group relative w-full h-[50vh] min-h-[380px] flex-1 flex flex-col items-center justify-center cursor-pointer overflow-hidden px-4 sm:px-8 py-6 transition-all duration-500 bg-gradient-to-br from-[#ff4d4f] via-[#e03131] to-[#b02525] hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
      >
        {/* Ambient Red Glow & Pattern Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.25),transparent_65%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Ambient Floating Decorative Tiles */}
        <div className="absolute -left-8 top-6 -rotate-12 select-none opacity-15 pointer-events-none hidden md:block">
          <div className="w-24 h-24 rounded-2xl bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-5xl font-black text-white shadow-2xl">
            A
          </div>
        </div>
        <div className="absolute -right-6 bottom-8 rotate-12 select-none opacity-15 pointer-events-none hidden md:block">
          <div className="w-20 h-20 rounded-2xl bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
            Z
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs sm:text-sm font-bold tracking-wide uppercase shadow-lg mb-3 sm:mb-4 group-hover:scale-105 transition-transform">
            <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>{t("yordle.badge")}</span>
          </div>

          {/* Interactive Wordle Title Letter Blocks */}
          <div
            ref={yordleTilesRef}
            className="flex items-center gap-1.5 sm:gap-3 my-1 sm:my-2"
          >
            {wordleLetters.map((tile, idx) => (
              <div
                key={idx}
                className={`w-11 h-12 sm:w-16 sm:h-18 md:w-20 md:h-22 rounded-xl sm:rounded-2xl ${tile.bg} border-2 sm:border-3 ${tile.border} ${tile.text} flex items-center justify-center text-2xl sm:text-4xl md:text-5xl font-black shadow-xl tracking-tight transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl`}
                style={{
                  transitionDelay: `${idx * 40}ms`,
                }}
              >
                {tile.char}
              </div>
            ))}
          </div>

          {/* Subtitle & Tagline */}
          <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-white/95 font-medium max-w-2xl px-2 leading-relaxed drop-shadow-sm">
            {t("yordle.description")}
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 sm:mt-4 text-xs sm:text-sm text-white/90">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 font-medium">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              {t("yordle.tag_letters")}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 font-medium">
              🌍 {t("yordle.tag_languages")}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 font-medium">
              ✨ {t("yordle.tag_custom")}
            </span>
          </div>

          {/* Playful CTA Button */}
          <div className="mt-4 sm:mt-5 inline-flex items-center gap-2.5 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-white text-red-600 font-black text-sm sm:text-base tracking-wide uppercase shadow-2xl transition-all duration-300 group-hover:scale-108 group-hover:bg-yellow-300 group-hover:text-slate-950 group-hover:shadow-[0_0_35px_rgba(255,255,255,0.7)] group-active:scale-98">
            <Gamepad2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span>{t("yordle.cta")}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Bottom subtle edge gradient */}
        <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </Link>


      {/* ─── YABOO GAME (BOTTOM 50% VH - BLUE BACKGROUND) ────────── */}
      <Link
        ref={yabooRef}
        href={`/${locale}/games/yaboo`}
        id="game-yaboo-card"
        aria-label="Preview Yaboo Taboo Game"
        className="group relative w-full h-[50vh] min-h-[380px] flex-1 flex flex-col items-center justify-center cursor-pointer overflow-hidden px-4 sm:px-8 py-6 transition-all duration-500 bg-gradient-to-br from-[#1c7ed6] via-[#1864ab] to-[#000182] hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
      >
        {/* Ambient Blue Glow & Pattern Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_50%_60%,rgba(100,180,255,0.3),transparent_70%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Ambient Floating Decorative Elements */}
        <div className="absolute -left-6 bottom-8 -rotate-12 select-none opacity-20 pointer-events-none hidden md:block">
          <div className="w-20 h-28 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 p-2 shadow-2xl flex flex-col justify-between text-xs text-white font-bold">
            <span className="text-yellow-300">TABOO</span>
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-red-400/80 rounded" />
              <div className="h-1.5 w-3/4 bg-red-400/80 rounded" />
              <div className="h-1.5 w-5/6 bg-red-400/80 rounded" />
            </div>
          </div>
        </div>

        <div className="absolute -right-6 top-8 rotate-12 select-none opacity-20 pointer-events-none hidden md:block">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
            🚨
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Status Badge & Category */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-yellow-400 text-slate-950 text-xs sm:text-sm font-black tracking-wider uppercase shadow-xl -rotate-2 group-hover:rotate-2 group-hover:scale-105 transition-all">
              <span>🚧</span>
              <span>{t("yaboo.status_badge")}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs sm:text-sm font-bold tracking-wide uppercase shadow-lg">
              <Users2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>{t("yaboo.badge")}</span>
            </div>
          </div>

          {/* Main Title */}
          <div className="flex items-center justify-center gap-3 my-1 sm:my-2">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight drop-shadow-md">
              {t("yaboo.title")}
            </h2>
            <span className="text-3xl sm:text-5xl animate-bounce group-hover:scale-125 transition-transform">
              🚨
            </span>
          </div>

          {/* Subtitle & Tagline */}
          <p className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg text-white/95 font-medium max-w-2xl px-2 leading-relaxed drop-shadow-sm">
            {t("yaboo.description")}
          </p>

          {/* Mini Floating Mockup Taboo Card Preview */}
          <div
            ref={yabooCardRef}
            className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-2xl bg-white/15 backdrop-blur-lg border border-white/30 shadow-2xl flex flex-wrap items-center justify-center gap-2 max-w-lg transition-transform group-hover:scale-103"
          >
            <span className="px-3 py-1 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wide">
              🎯 {t("yaboo.floating_target")}
            </span>
            <span className="text-white/60 text-xs hidden sm:inline">|</span>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
              {t("yaboo.forbidden_list")
                .split(",")
                .slice(0, 4)
                .map((word, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-red-500/80 text-white text-xs font-semibold line-through"
                  >
                    {word.trim()}
                  </span>
                ))}
            </div>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 sm:mt-4 text-xs sm:text-sm text-white/90">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
              {t("yaboo.tag_forbidden")}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 font-medium">
              <Clock className="w-3.5 h-3.5 text-yellow-300" />
              {t("yaboo.tag_timer")}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 font-medium">
              <Users2 className="w-3.5 h-3.5 text-pink-300" />
              {t("yaboo.tag_party")}
            </span>
          </div>

          {/* Playful CTA Button */}
          <div className="mt-4 sm:mt-5 inline-flex items-center gap-2.5 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-cyan-400 text-slate-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-2xl transition-all duration-300 group-hover:scale-108 group-hover:bg-white group-hover:text-blue-700 group-hover:shadow-[0_0_35px_rgba(56,189,248,0.7)] group-active:scale-98">
            <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span>{t("yaboo.cta")}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Top subtle edge gradient */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      </Link>
    </div>
  );
}
