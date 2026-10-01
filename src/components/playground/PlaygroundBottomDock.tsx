"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  Sparkles,
  X,
  Plus,
  Check,
  Loader2,
  Coins,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkle,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  GeneratedPhrase,
  PlaygroundDictionary,
  SavedPlaygroundPhrase,
} from "@/lib/api/playground.api";
import type { Word } from "@/lib/db/schema";
import { createWord } from "@/lib/api/words.api";
import { useToast } from "@/components/ui/Toast";
import HighlightedPhraseText from "./HighlightedPhraseText";

export interface SelectedWordItem {
  wordId: string;
  title: string;
  translation: string;
  dictionaryId: string;
  dictionaryTitle: string;
}

interface PlaygroundBottomDockProps {
  selectedWords: SelectedWordItem[];
  onRemoveWord: (wordId: string) => void;
  onClearAll: () => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  phrases: GeneratedPhrase[];
  dictionaries: PlaygroundDictionary[];
  aiCredits: number;
  onWordAdded: (dictionaryId: string, newWord: Word) => void;
  savedPhrases?: SavedPlaygroundPhrase[];
  onToggleSavePhrase?: (phrase: GeneratedPhrase) => void;
  language?: string;
}

export default function PlaygroundBottomDock({
  selectedWords,
  onRemoveWord,
  onClearAll,
  onGenerate,
  isGenerating,
  phrases,
  dictionaries,
  aiCredits,
  onWordAdded,
  savedPhrases,
  onToggleSavePhrase,
  language = "en",
}: PlaygroundBottomDockProps) {
  const t = useTranslations("playground");
  const { toast } = useToast();

  const [isExpanded, setIsExpanded] = useState(true);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [savingSuggestionKey, setSavingSuggestionKey] = useState<string | null>(
    null,
  );

  // Auto-open Chosen Words section when phrases are generated
  const prevGeneratingRef = useRef(isGenerating);
  const prevPhrasesLengthRef = useRef(phrases.length);

  useEffect(() => {
    const justFinishedGenerating = prevGeneratingRef.current && !isGenerating;
    const phrasesReceived =
      phrases.length > 0 && phrases.length !== prevPhrasesLengthRef.current;

    if ((justFinishedGenerating || phrasesReceived) && phrases.length > 0) {
      setIsExpanded(true);
    }

    prevGeneratingRef.current = isGenerating;
    prevPhrasesLengthRef.current = phrases.length;
  }, [isGenerating, phrases.length]);

  // Text-to-speech voice playback for phrases
  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Speech synthesis not supported in your browser.", "info");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      de: "de-DE",
      es: "es-ES",
      fr: "fr-FR",
      en: "en-US",
      tr: "tr-TR",
    };
    utterance.lang = (language && langMap[language]) || language || "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleAddSuggestion = async (
    suggestion: { title: string; translation: string; dictionaryId?: string },
    phraseIndex: number,
    suggIndex: number,
  ) => {
    // Find the dictionary this suggestion fits into
    const targetDict =
      (suggestion.dictionaryId &&
        dictionaries.find((d) => d.id === suggestion.dictionaryId)) ||
      dictionaries[0];

    if (!targetDict) {
      toast("No dictionary found to add word to.", "warning");
      return;
    }

    const key = `${phraseIndex}-${suggIndex}-${suggestion.title}`;
    setSavingSuggestionKey(key);

    try {
      const res = await createWord({
        dictionaryId: targetDict.id,
        title: suggestion.title,
        translation: suggestion.translation,
      });

      const newWord = (res as { word?: Word })?.word || {
        id: crypto.randomUUID(),
        dictionaryId: targetDict.id,
        title: suggestion.title,
        translation: suggestion.translation,
        order: targetDict.words.length,
        lastModifiedById: null,
        createdAt: new Date(),
      };

      onWordAdded(targetDict.id, newWord as Word);
      setAddedSuggestions((prev) => new Set(prev).add(key));

      toast(`"${suggestion.title}" added to ${targetDict.title}!`, "success");
    } catch (err) {
      console.error("Auto-save suggestion error:", err);
      toast("Failed to save word", "error");
    } finally {
      setSavingSuggestionKey(null);
    }
  };

  const wordsForHighlighting = selectedWords.map((w) => w.title);

  return (
    <aside
      aria-label="Playground Word Mashup & AI Phrases"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[96%] max-w-5xl z-40"
    >
      <div className="relative rounded-3xl border border-[var(--border-color)] bg-[var(--surface)]/95 backdrop-blur-2xl shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300">
        {/* Top Dock Header / Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg)]/40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1 rounded-lg text-[var(--fg)]/60 hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
              title={isExpanded ? "Collapse dock" : "Expand dock"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--fg)] font-heading">
                {t("chosen_words")}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400">
                {selectedWords.length}
              </span>
            </div>

            {selectedWords.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-[var(--fg)]/50 hover:text-red-500 hover:underline transition-colors ml-2"
              >
                {t("clear_all")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* User AI Token Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Coins className="h-3.5 w-3.5" />
              <span>{aiCredits} Tokens</span>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || selectedWords.length === 0 || aiCredits <= 0}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all",
                selectedWords.length > 0 && aiCredits > 0
                  ? "bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/25 active:scale-95"
                  : "bg-[var(--surface)] text-[var(--fg)]/40 border border-[var(--border-color)] cursor-not-allowed",
              )}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{t("generate_phrases_credit")}</span>
            </button>
          </div>
        </div>

        {/* Expandable Dock Body */}
        {isExpanded && (
          <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Selected Words Tray */}
            {selectedWords.length === 0 ? (
              <div className="p-3 text-center text-xs text-[var(--fg)]/50 bg-[var(--bg)]/40 rounded-2xl border border-dashed border-[var(--border-color)]">
                {t("chosen_words_empty")}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedWords.map((item) => (
                  <div
                    key={item.wordId}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl text-xs bg-primary-500/10 text-[var(--fg)] border border-primary-500/20 shadow-xs transition-all"
                  >
                    <span className="font-bold text-[var(--fg)]">{item.title}</span>
                    <span className="text-[var(--fg)]/60 italic">
                      ({item.translation})
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-600 dark:text-primary-300 font-semibold ml-1">
                      {item.dictionaryTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveWord(item.wordId)}
                      className="p-1 rounded-md text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Generated Phrases List */}
            {phrases.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkle className="h-4 w-4 text-primary-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]/70">
                      Generated Phrases ({phrases.length})
                    </span>
                  </div>
                </div>

                {/* Phrase Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {phrases.map((phraseObj, pIndex) => {
                    const isSaved = savedPhrases?.some(
                      (p) => p.phrase === phraseObj.phrase,
                    );

                    return (
                      <div
                        key={pIndex}
                        className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]/50 hover:border-primary-500/30 transition-all flex flex-col justify-between shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            {phraseObj.context ? (
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300">
                                {phraseObj.context}
                              </span>
                            ) : (
                              <span />
                            )}

                            <div className="flex items-center gap-1">
                              {/* TTS Voice Pronunciation */}
                              <button
                                type="button"
                                onClick={() => handleSpeak(phraseObj.phrase)}
                                className="p-1.5 rounded-xl text-[var(--fg)]/40 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10 transition-all active:scale-90"
                                title="Pronounce phrase"
                                aria-label="Pronounce phrase"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>

                              {onToggleSavePhrase && (
                                <button
                                  type="button"
                                  onClick={() => onToggleSavePhrase(phraseObj)}
                                  className={cn(
                                    "p-1.5 rounded-xl transition-all active:scale-90",
                                    isSaved
                                      ? "text-amber-500 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30"
                                      : "text-[var(--fg)]/40 hover:text-amber-500 hover:bg-amber-500/10 border border-transparent",
                                  )}
                                  title={
                                    isSaved
                                      ? "Saved phrase (click to remove)"
                                      : "Save phrase to playground"
                                  }
                                  aria-label="Save phrase"
                                >
                                  <Bookmark
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      isSaved && "fill-current",
                                    )}
                                  />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-semibold text-[var(--fg)] leading-relaxed mb-1.5">
                            <HighlightedPhraseText
                              phrase={phraseObj.phrase}
                              wordsToHighlight={[
                                ...selectedWords.map((w) => w.title),
                                ...(phraseObj.matchedWords || []),
                              ]}
                            />
                          </p>
                          <p className="text-xs text-[var(--fg)]/60 italic">
                            &quot;{phraseObj.translation}&quot;
                          </p>
                        </div>

                      {/* Suggestions within phrase */}
                      {phraseObj.suggestedWords &&
                        phraseObj.suggestedWords.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[var(--border-color)]/60">
                            <span className="text-[10px] font-semibold text-[var(--fg)]/50 uppercase block mb-1.5">
                              {t("suggested_words")} (Auto-Save):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {phraseObj.suggestedWords.map((sugg, sIndex) => {
                                const key = `${pIndex}-${sIndex}-${sugg.title}`;
                                const isAdded = addedSuggestions.has(key);
                                const isSaving = savingSuggestionKey === key;
                                const targetDict =
                                  (sugg.dictionaryId &&
                                    dictionaries.find((d) => d.id === sugg.dictionaryId)) ||
                                  dictionaries[0];

                                return (
                                  <button
                                    key={sIndex}
                                    type="button"
                                    onClick={() =>
                                      !isAdded &&
                                      !isSaving &&
                                      handleAddSuggestion(
                                        sugg,
                                        pIndex,
                                        sIndex,
                                      )
                                    }
                                    disabled={isAdded || isSaving}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all",
                                      isAdded
                                        ? "bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30 cursor-default"
                                        : "bg-[var(--bg)] border border-[var(--border-color)] hover:border-primary-500 hover:bg-primary-500/10 text-[var(--fg)] active:scale-95",
                                    )}
                                    title={
                                      isAdded
                                        ? `Added to ${targetDict?.title}`
                                        : `Click to auto-save "${sugg.title}" to ${targetDict?.title}`
                                    }
                                  >
                                    {isSaving ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-primary-500 shrink-0" />
                                    ) : isAdded ? (
                                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                                    ) : (
                                      <Plus className="h-3 w-3 text-primary-500 shrink-0" />
                                    )}
                                    <span>{sugg.title}</span>
                                    <span className="text-[10px] text-[var(--fg)]/40 font-normal">
                                      ({sugg.translation})
                                    </span>
                                    {targetDict && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300 font-bold ml-0.5">
                                        {targetDict.title}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
