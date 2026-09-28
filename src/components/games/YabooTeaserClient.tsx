"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowLeft,
  Volume2,
  Clock,
  Sparkles,
  Gamepad2,
  AlertOctagon,
  RefreshCw,
  Trophy,
  Users2,
  CheckCircle2,
} from "lucide-react";

interface YabooTeaserClientProps {
  locale: string;
}

const SAMPLE_CARDS = [
  {
    target: "COFFEE",
    forbidden: ["Tea", "Caffeine", "Drink", "Morning", "Cup"],
    category: "Food & Beverage",
  },
  {
    target: "INTERNET",
    forbidden: ["Web", "Computer", "Online", "Wifi", "Browse"],
    category: "Technology",
  },
  {
    target: "PIZZA",
    forbidden: ["Cheese", "Slice", "Italy", "Dough", "Oven"],
    category: "Food & Fun",
  },
  {
    target: "LINGDB",
    forbidden: ["Language", "Dictionary", "Words", "Flashcards", "App"],
    category: "Super Special",
  },
];

export default function YabooTeaserClient({ locale }: YabooTeaserClientProps) {
  const t = useTranslations("games");
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const buzzerRef = useRef<HTMLButtonElement>(null);

  const [cardIndex, setCardIndex] = useState(0);
  const [buzzCount, setBuzzCount] = useState(0);
  const [isBuzzing, setIsBuzzing] = useState(false);

  const currentCard = SAMPLE_CARDS[cardIndex];

  useGSAP(
    () => {
      gsap.fromTo(
        ".teaser-hero",
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
      );

      gsap.fromTo(
        cardRef.current,
        { scale: 0.9, opacity: 0, rotateY: 15 },
        { scale: 1, opacity: 1, rotateY: 0, duration: 0.8, ease: "back.out(1.5)", delay: 0.2 }
      );
    },
    { scope: containerRef }
  );

  const handleNextCard = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        scale: 0.92,
        opacity: 0.4,
        duration: 0.15,
        onComplete: () => {
          setCardIndex((prev) => (prev + 1) % SAMPLE_CARDS.length);
          gsap.to(cardRef.current, {
            scale: 1,
            opacity: 1,
            duration: 0.3,
            ease: "back.out(2)",
          });
        },
      });
    } else {
      setCardIndex((prev) => (prev + 1) % SAMPLE_CARDS.length);
    }
  };

  const handleHitBuzzer = () => {
    setBuzzCount((prev) => prev + 1);
    setIsBuzzing(true);

    if (buzzerRef.current) {
      gsap.fromTo(
        buzzerRef.current,
        { scale: 0.85, rotate: -5 },
        { scale: 1, rotate: 0, duration: 0.3, ease: "elastic.out(1.5, 0.3)" }
      );
    }

    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { x: -10 },
        { x: 10, repeat: 5, yoyo: true, duration: 0.05, ease: "linear", onComplete: () => {
          gsap.set(cardRef.current, { x: 0 });
          setTimeout(() => setIsBuzzing(false), 800);
        }}
      );
    } else {
      setTimeout(() => setIsBuzzing(false), 800);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#1c7ed6] via-[#1864ab] to-[#000182] text-white py-8 px-4 sm:px-6 relative overflow-hidden"
    >
      {/* Background radial effects */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_50%_20%,rgba(100,180,255,0.4),transparent_65%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Navigation & Back Button */}
        <div className="w-full flex items-center justify-between mb-6">
          <Link
            href={`/${locale}/games`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-sm hover:bg-white/30 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("yaboo_teaser.back_to_games")}</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg">
            <span>🚧</span>
            <span>{t("yaboo_teaser.badge")}</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="teaser-hero text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>{t("yaboo.subtitle")}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-md text-white">
            {t("yaboo_teaser.headline")}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/90 leading-relaxed font-medium">
            {t("yaboo_teaser.subheadline")}
          </p>
        </div>

        {/* ─── INTERACTIVE TABOO CARD MOCKUP ───────────────────── */}
        <div className="w-full max-w-md mx-auto mb-10">
          <div
            ref={cardRef}
            className="relative rounded-3xl bg-white text-slate-900 shadow-2xl p-6 sm:p-8 border-4 border-yellow-400 overflow-hidden transform-gpu"
          >
            {/* Card Header & Category */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
              <span className="text-xs font-black tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                {currentCard.category}
              </span>
              <button
                onClick={handleNextCard}
                className="cursor-pointer inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                title="Next Card"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Next Sample</span>
              </button>
            </div>

            {/* Target Word */}
            <div className="text-center py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-200 block mb-1">
                {t("yaboo_teaser.target_label")}
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-wide">
                {currentCard.target}
              </h3>
            </div>

            {/* Forbidden Taboo Words */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-red-500 block text-center mb-3">
                🚫 {t("yaboo_teaser.taboo_label")}
              </span>
              <div className="space-y-2">
                {currentCard.forbidden.map((word, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold text-sm sm:text-base tracking-wide"
                  >
                    <span className="line-through">{word}</span>
                    <span className="text-red-400 text-xs font-extrabold uppercase">
                      TABOO #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buzz feedback overlay */}
            {isBuzzing && (
              <div className="absolute inset-0 bg-red-600/95 flex flex-col items-center justify-center text-white p-6 text-center animate-pulse z-30">
                <AlertOctagon className="w-16 h-16 text-yellow-300 mb-2 animate-bounce" />
                <h4 className="text-3xl font-black uppercase tracking-tight">
                  {t("yaboo_teaser.buzz_sound_text")}
                </h4>
                <p className="text-sm font-semibold mt-1 text-white/90">
                  You said a forbidden word!
                </p>
              </div>
            )}
          </div>

          {/* Interactive Buzzer Trigger */}
          <div className="mt-6 flex flex-col items-center">
            <button
              ref={buzzerRef}
              onClick={handleHitBuzzer}
              className="cursor-pointer group/buzzer relative px-8 py-4 rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider shadow-[0_8px_0_#991b1b,0_15px_25px_rgba(239,68,68,0.5)] active:translate-y-2 active:shadow-[0_2px_0_#991b1b] transition-all flex items-center gap-3 border-2 border-red-400"
            >
              <Volume2 className="w-6 h-6 animate-pulse" />
              <span>{t("yaboo_teaser.buzzer_label")}</span>
              <span className="text-2xl">🚨</span>
            </button>
            {buzzCount > 0 && (
              <p className="mt-2 text-xs font-bold text-yellow-300">
                Buzzed {buzzCount} times! (No taboo words allowed!)
              </p>
            )}
          </div>
        </div>

        {/* ─── HOW TO PLAY RULES ──────────────────────────────── */}
        <div className="w-full max-w-3xl mb-12">
          <h3 className="text-2xl sm:text-3xl font-black text-center mb-6 text-white tracking-tight flex items-center justify-center gap-2">
            <span>🎮</span>
            <span>{t("yaboo_teaser.how_to_play")}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-yellow-400 text-slate-900 flex items-center justify-center font-black text-xl mb-3 shadow-lg">
                1
              </div>
              <h4 className="font-bold text-lg mb-1">{t("yaboo_teaser.rule1_title")}</h4>
              <p className="text-sm text-white/80 leading-relaxed">
                {t("yaboo_teaser.rule1_desc")}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-xl mb-3 shadow-lg">
                2
              </div>
              <h4 className="font-bold text-lg mb-1">{t("yaboo_teaser.rule2_title")}</h4>
              <p className="text-sm text-white/80 leading-relaxed">
                {t("yaboo_teaser.rule2_desc")}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-cyan-400 text-slate-900 flex items-center justify-center font-black text-xl mb-3 shadow-lg">
                3
              </div>
              <h4 className="font-bold text-lg mb-1">{t("yaboo_teaser.rule3_title")}</h4>
              <p className="text-sm text-white/80 leading-relaxed">
                {t("yaboo_teaser.rule3_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM CALL TO ACTION ──────────────────────────── */}
        <div className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/25 text-center shadow-2xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-yellow-400/20 text-yellow-300 flex items-center justify-center mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-xl sm:text-2xl font-black mb-2">
            {t("yaboo_teaser.notify_title")}
          </h4>
          <p className="text-sm sm:text-base text-white/80 mb-6 max-w-md leading-relaxed">
            {t("yaboo_teaser.notify_desc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <Link
              href={`/${locale}/wordle`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wide shadow-xl hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>{t("yaboo_teaser.try_yordle_instead")}</span>
            </Link>
            <Link
              href={`/${locale}/games`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/20 border border-white/30 text-white font-bold text-sm uppercase tracking-wide hover:bg-white/30 active:scale-95 transition-all"
            >
              <span>{t("yaboo_teaser.back_to_games")}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
