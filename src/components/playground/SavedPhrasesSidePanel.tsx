"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  X,
  Copy,
  Check,
  Volume2,
  Trash2,
  Sparkles,
  Search,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/Toast";
import HighlightedPhraseText from "./HighlightedPhraseText";
import type { SavedPlaygroundPhrase } from "@/lib/api/playground.api";

interface SavedPhrasesSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  savedPhrases: SavedPlaygroundPhrase[];
  onDeletePhrase: (phraseId: string) => void;
  onClearAllPhrases?: () => void;
  language: string;
  packTitle: string;
}

export default function SavedPhrasesSidePanel({
  isOpen,
  onClose,
  savedPhrases,
  onDeletePhrase,
  onClearAllPhrases,
  language,
  packTitle,
}: SavedPhrasesSidePanelProps) {
  const t = useTranslations("playground");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy phrase text to clipboard
  const handleCopy = (phraseObj: SavedPlaygroundPhrase) => {
    navigator.clipboard.writeText(phraseObj.phrase);
    setCopiedId(phraseObj.id);
    toast("Phrase copied to clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text-to-speech pronunciation
  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Speech synthesis not supported in your browser.", "info");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Map language code (de, es, fr, en, tr) to full BCP-47 locale tag
    const langMap: Record<string, string> = {
      de: "de-DE",
      es: "es-ES",
      fr: "fr-FR",
      en: "en-US",
      tr: "tr-TR",
    };
    utterance.lang = langMap[language] || language;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Filter phrases by search query
  const filteredPhrases = savedPhrases.filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.phrase.toLowerCase().includes(query) ||
      p.translation.toLowerCase().includes(query) ||
      (p.context && p.context.toLowerCase().includes(query))
    );
  });

  return (
    <>
      {/* Backdrop overlay on smaller screens */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-45 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Slide-out Panel on the Right Side */}
      <aside
        aria-label="Saved Phrases"
        className={cn(
          "fixed top-16 right-0 z-50 h-[calc(100vh-4rem)] w-84 sm:w-96 flex flex-col",
          "border-l border-[var(--border-color)] bg-[var(--surface)]/95 backdrop-blur-2xl shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg)]/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Bookmark className="h-4 w-4 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-[var(--fg)] truncate font-heading">
                  Saved Phrases
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {savedPhrases.length}
                </span>
              </div>
              <p className="text-[11px] text-[var(--fg)]/50 truncate">
                {packTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {savedPhrases.length > 1 && onClearAllPhrases && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to clear all saved phrases for this pack?")) {
                    onClearAllPhrases();
                  }
                }}
                className="p-1.5 rounded-lg text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Clear all saved phrases"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[var(--bg)] text-[var(--fg)]/60 hover:text-[var(--fg)] transition-colors active:scale-95"
              title="Close panel"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search bar (if phrases exist) */}
        {savedPhrases.length > 2 && (
          <div className="px-4 py-2.5 border-b border-[var(--border-color)]/60 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--fg)]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved phrases..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[var(--bg)]/70 border border-[var(--border-color)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-hidden focus:border-primary-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg)]/40 hover:text-[var(--fg)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Panel Body: Phrases List or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedPhrases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center p-6 text-[var(--fg)]/60">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
                <Bookmark className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-sm text-[var(--fg)] mb-1">
                No saved phrases yet
              </h3>
              <p className="text-xs text-[var(--fg)]/50 max-w-[220px] leading-relaxed">
                Generate AI sentences with the dock below and click the bookmark icon on any phrase to save it here for this pack.
              </p>
            </div>
          ) : filteredPhrases.length === 0 ? (
            <div className="text-center py-12 text-xs text-[var(--fg)]/50">
              No saved phrases match &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredPhrases.map((phraseItem) => (
              <div
                key={phraseItem.id}
                className="group relative p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)]/50 hover:bg-[var(--bg)]/80 hover:border-primary-500/40 transition-all flex flex-col justify-between gap-2 shadow-xs"
              >
                <div>
                  {phraseItem.context && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300 mb-1.5">
                      {phraseItem.context}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-[var(--fg)] leading-snug">
                    <HighlightedPhraseText
                      phrase={phraseItem.phrase}
                      wordsToHighlight={phraseItem.matchedWords || []}
                    />
                  </p>
                  <p className="text-xs text-[var(--fg)]/60 italic mt-1">
                    &quot;{phraseItem.translation}&quot;
                  </p>
                </div>

                {/* Phrase Action Buttons */}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-[var(--border-color)]/50 text-xs">
                  <span className="text-[10px] text-[var(--fg)]/40 font-mono">
                    {phraseItem.createdAt
                      ? new Date(phraseItem.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Speak TTS Button */}
                    <button
                      type="button"
                      onClick={() => handleSpeak(phraseItem.phrase)}
                      className="p-1.5 rounded-lg text-[var(--fg)]/50 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                      title="Pronounce phrase"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Copy Text Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(phraseItem)}
                      className="p-1.5 rounded-lg text-[var(--fg)]/50 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === phraseItem.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Delete Phrase Button */}
                    <button
                      type="button"
                      onClick={() => onDeletePhrase(phraseItem.id)}
                      className="p-1.5 rounded-lg text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete saved phrase"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
