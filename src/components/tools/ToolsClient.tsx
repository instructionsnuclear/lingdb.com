"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Layers,
  Sparkles,
  ArrowRight,
  Workflow,
} from "lucide-react";
import type { EnrichedDictionaryList } from "@/lib/api/playground.api";
import DictionaryListSelectorModal from "@/components/playground/DictionaryListSelectorModal";
import DialogueTreeSelectorModal from "@/components/dialogue-trees/DialogueTreeSelectorModal";

export interface ToolsUserDictionary {
  id: string;
  title: string;
  description: string | null;
  language: string;
  wordCount: number;
}

interface ToolsClientProps {
  locale: string;
  isLoggedIn: boolean;
  userDictionaries: ToolsUserDictionary[];
  initialSavedPacks: EnrichedDictionaryList[];
  userTrees: Array<{ id: string; title: string; language: string; nodes?: any }>;
}

export default function ToolsClient({
  locale,
  isLoggedIn,
  userDictionaries,
  initialSavedPacks,
  userTrees: initialUserTrees,
}: ToolsClientProps) {
  const t = useTranslations("tools");
  const router = useRouter();

  const [savedPacks, setSavedPacks] = useState<EnrichedDictionaryList[]>(initialSavedPacks);
  const [userTrees, setUserTrees] = useState(initialUserTrees);
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);

  const handleOpenPlaygroundModal = () => {
    if (!isLoggedIn) {
      router.push(`/${locale}/login?returnUrl=/${locale}/tools`);
      return;
    }
    setIsPlaygroundModalOpen(true);
  };

  const handleOpenTreeModal = () => {
    if (!isLoggedIn) {
      router.push(`/${locale}/login?returnUrl=/${locale}/tools`);
      return;
    }
    setIsTreeModalOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-[var(--fg)] tracking-tight">
            {t("pageTitle")}
          </h1>

          {!isLoggedIn && (
            <div className="pt-1">
              <Link
                href={`/${locale}/login?returnUrl=/${locale}/tools`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                <span>{t("loginPrompt")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* 2-Column Tool Studio Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ─── CARD 1: PLAYGROUND ─── */}
          <div className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 bg-[var(--surface)]/80 dark:bg-white/[0.03] border border-[var(--border-color)] dark:border-white/10 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-emerald-500/40 hover:-translate-y-1 overflow-hidden">
            {/* Top corner gradient highlight */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div className="space-y-6 relative z-10">
              {/* Icon Row */}
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--fg)] tracking-tight">
                  {t("playground.title")}
                </h2>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {t("playground.subtitle")}
                </p>
              </div>

              {/* ─── Playground Symbolic Illustration ─── */}
              <div className="h-52 sm:h-56 rounded-2xl p-4 sm:p-5 bg-[var(--bg)]/60 dark:bg-black/30 border border-[var(--border-color)]/70 relative overflow-hidden space-y-3.5 select-none shadow-inner flex flex-col justify-center">
                {/* Subtle Dot Grid Background */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-15"
                  style={{
                    backgroundImage:
                      "radial-gradient(currentColor 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Simulated Floating Word Tokens */}
                <div className="flex flex-wrap items-center justify-center gap-2 relative z-10">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm transform -rotate-1 transition-transform group-hover:rotate-0">
                    <span className="text-[10px] opacity-75">🇩🇪</span>
                    <span>der Apfel</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm transform rotate-2 transition-transform group-hover:rotate-0">
                    <span className="text-[10px] opacity-75">🇩🇪</span>
                    <span>schmecken</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm transform -rotate-2 transition-transform group-hover:rotate-0">
                    <span className="text-[10px] opacity-75">🇩🇪</span>
                    <span>köstlich</span>
                  </div>
                </div>

                {/* Energy Convergence Icon */}
                <div className="flex items-center justify-center relative z-10">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Synthesized Output Banner */}
                <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/25 relative z-10 text-center space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-[var(--fg)] italic">
                    &ldquo;{t("playground.demoSentence")}&rdquo;
                  </p>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{t("playground.demoTag")}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[var(--fg)]/70 leading-relaxed">
                {t("playground.description")}
              </p>
            </div>

            {/* Bottom Action Row */}
            <div className="pt-6 border-t border-[var(--border-color)]/60 relative z-10">
              <button
                type="button"
                id="launch-playground-btn"
                onClick={handleOpenPlaygroundModal}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>{t("playground.cta")}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* ─── CARD 2: DIALOGUE TREE ─── */}
          <div className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 bg-[var(--surface)]/80 dark:bg-white/[0.03] border border-[var(--border-color)] dark:border-white/10 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-violet-500/40 hover:-translate-y-1 overflow-hidden">
            {/* Top corner gradient highlight */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-500/15 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />

            <div className="space-y-6 relative z-10">
              {/* Icon Row */}
              <div>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
                  <Workflow className="w-6 h-6" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[var(--fg)] tracking-tight">
                  {t("dialogueTrees.title")}
                </h2>
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-0.5">
                  {t("dialogueTrees.subtitle")}
                </p>
              </div>

              {/* ─── Dialogue Tree Symbolic Illustration ─── */}
              <div className="h-52 sm:h-56 rounded-2xl p-4 sm:p-5 bg-[var(--bg)]/60 dark:bg-black/30 border border-[var(--border-color)]/70 relative overflow-hidden space-y-3 select-none shadow-inner flex flex-col justify-center">
                {/* Subtle Grid Dot Background */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-15"
                  style={{
                    backgroundImage:
                      "radial-gradient(currentColor 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Root Node (Speaker A) */}
                <div className="relative z-10 max-w-xs mx-auto p-2.5 rounded-xl bg-[var(--surface)] border border-primary-500/30 shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
                      {t("dialogueTrees.demoSpeakerA")}
                    </span>
                    <span className="text-[10px] text-[var(--fg)]/40 font-mono">
                      Root
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[var(--fg)]">
                    {t("dialogueTrees.demoPrompt")}
                  </p>
                </div>

                {/* Branching SVG Connections */}
                <div className="relative z-10 flex justify-center py-0.5">
                  <svg
                    className="w-48 h-6 text-violet-500/40"
                    viewBox="0 0 192 24"
                    fill="none"
                  >
                    <path
                      d="M96 0 V10 C96 18 36 12 36 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M96 0 V10 C96 18 156 12 156 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Branch Choices (Speaker B) */}
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-violet-500/30 shadow-sm text-left">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 block w-max mb-1">
                      {t("dialogueTrees.demoSpeakerB")}
                    </span>
                    <p className="text-[11px] font-medium text-[var(--fg)] leading-tight">
                      {t("dialogueTrees.demoBranch1")}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-violet-500/30 shadow-sm text-left">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 block w-max mb-1">
                      {t("dialogueTrees.demoSpeakerB")}
                    </span>
                    <p className="text-[11px] font-medium text-[var(--fg)] leading-tight">
                      {t("dialogueTrees.demoBranch2")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[var(--fg)]/70 leading-relaxed">
                {t("dialogueTrees.description")}
              </p>
            </div>

            {/* Bottom Action Row */}
            <div className="pt-6 border-t border-[var(--border-color)]/60 relative z-10">
              <button
                type="button"
                id="create-dialogue-tree-btn"
                onClick={handleOpenTreeModal}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Workflow className="w-4 h-4" />
                <span>{t("dialogueTrees.cta")}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: Select or Create Dictionary List (Playground) ─── */}
      <DictionaryListSelectorModal
        isOpen={isPlaygroundModalOpen}
        isInline={false}
        onClose={() => setIsPlaygroundModalOpen(false)}
        savedPacks={savedPacks}
        userDictionaries={userDictionaries}
        onSelectPack={(pack) => {
          setIsPlaygroundModalOpen(false);
          if (pack.id) {
            router.push(`/${locale}/playground?packId=${pack.id}`);
          } else {
            const q = new URLSearchParams({
              dictIds: pack.dictionaryIds.join(","),
              lang: pack.language,
              title: pack.title,
            });
            router.push(`/${locale}/playground?${q.toString()}`);
          }
        }}
        onPackCreated={(newPack) => {
          setSavedPacks((prev) => [newPack, ...prev]);
          setIsPlaygroundModalOpen(false);
          router.push(`/${locale}/playground?packId=${newPack.id}`);
        }}
        onPackDeleted={(packId) => {
          setSavedPacks((prev) => prev.filter((p) => p.id !== packId));
        }}
      />

      {/* ─── MODAL 2: Select or Create Dialogue Tree ─── */}
      <DialogueTreeSelectorModal
        isOpen={isTreeModalOpen}
        isInline={false}
        onClose={() => setIsTreeModalOpen(false)}
        savedTrees={userTrees}
        onSelectTree={(tree) => {
          setIsTreeModalOpen(false);
          router.push(`/${locale}/dialogue-trees?treeId=${tree.id}`);
        }}
        onTreeCreated={(newTree) => {
          setUserTrees((prev) => [newTree, ...prev]);
          setIsTreeModalOpen(false);
          router.push(`/${locale}/dialogue-trees?treeId=${newTree.id}`);
        }}
        onTreeDeleted={(treeId) => {
          setUserTrees((prev) => prev.filter((t) => t.id !== treeId));
        }}
      />
    </div>
  );
}
