"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Loader2, BookOpen, Check, X, Volume2 } from "lucide-react";
import {
  saveWordFromTree,
  translateWordFromTree,
} from "@/lib/api/dialogue-trees.api";
import { deleteWord } from "@/lib/api/words.api";
import { useToast } from "@/components/ui/Toast";
import type { Word } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import { useTranslations, useLocale } from "next-intl";

export interface UserDictionaryMeta {
  id: string;
  title: string;
  language: string;
  wordCount?: number;
}

export interface SavedWordInstance {
  id: string;
  dictionaryId: string;
  dictionaryTitle: string;
  translation: string;
}

export interface SavedWordInfo {
  id?: string;
  title: string;
  translation: string;
  dictionaryTitle?: string;
  dictionaryId?: string;
  instances?: SavedWordInstance[];
}

interface DialoguePhraseWordsProps {
  phrase: string;
  sourceLanguage?: string;
  savedWordsMap: Map<string, SavedWordInfo>;
  userDictionaries: UserDictionaryMeta[];
  onWordSaved: (word: Word, dictTitle: string) => void;
  onWordDeleted?: (
    wordId: string,
    cleanedWord: string,
    dictionaryId: string,
  ) => void;
  className?: string;
}

// Clean non-letter/digit edge characters for dictionary matching
function cleanToken(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
}

export default function DialoguePhraseWords({
  phrase,
  sourceLanguage,
  savedWordsMap,
  userDictionaries,
  onWordSaved,
  onWordDeleted,
  className,
}: DialoguePhraseWordsProps) {
  const t = useTranslations("dialogueTrees");
  const locale = useLocale();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeMenuWord, setActiveMenuWord] = useState<{
    word: string;
    displayWord: string;
    tokenIndex: number;
    rect: DOMRect;
    savedInfo?: SavedWordInfo;
  } | null>(null);
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);
  const [wordTranslation, setWordTranslation] = useState<string | null>(null);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const translationCacheRef = useRef<Map<string, string>>(new Map());
  const inFlightTranslationRef = useRef<Promise<string | null> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel any ongoing word speech when modal closes
  useEffect(() => {
    if (!activeMenuWord && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingWord(null);
    }
  }, [activeMenuWord]);

  const handleSpeakWord = (wordText: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast(
        t("speechNotSupported") ||
          "Speech synthesis not supported in your browser.",
        "info",
      );
      return;
    }

    if (window.speechSynthesis.speaking && speakingWord === wordText) {
      window.speechSynthesis.cancel();
      setSpeakingWord(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(wordText);
    const langMap: Record<string, string> = {
      de: "de-DE",
      es: "es-ES",
      fr: "fr-FR",
      en: "en-US",
      tr: "tr-TR",
    };
    utterance.lang =
      (sourceLanguage && langMap[sourceLanguage.toLowerCase()]) ||
      sourceLanguage ||
      "en-US";
    utterance.rate = 0.85;

    utterance.onstart = () => {
      setSpeakingWord(wordText);
    };
    utterance.onend = () => {
      setSpeakingWord(null);
    };
    utterance.onerror = () => {
      setSpeakingWord(null);
    };

    setSpeakingWord(wordText);
    window.speechSynthesis.speak(utterance);
  };

  // Close dictionary picker on outside click or canvas wheel scroll
  useEffect(() => {
    if (!activeMenuWord) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuWord(null);
      }
    };
    const handleDismissOnScroll = (e: WheelEvent) => {
      // Do NOT dismiss if wheel scroll happens inside the dictionary menu
      if (
        menuRef.current &&
        (menuRef.current === e.target ||
          menuRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setActiveMenuWord(null);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("wheel", handleDismissOnScroll, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("wheel", handleDismissOnScroll);
    };
  }, [activeMenuWord]);

  // Fetch word translation using OPENROUTER_TRANSLATION_MODEL when a word is clicked
  useEffect(() => {
    if (!activeMenuWord) {
      setWordTranslation(null);
      setIsLoadingTranslation(false);
      inFlightTranslationRef.current = null;
      return;
    }

    // If the word was already saved, immediately display the known translation!
    if (activeMenuWord.savedInfo?.translation) {
      setWordTranslation(activeMenuWord.savedInfo.translation);
      setIsLoadingTranslation(false);
      inFlightTranslationRef.current = null;
      return;
    }

    const wordToTranslate = activeMenuWord.displayWord || activeMenuWord.word;
    const cacheKey = `${(sourceLanguage || "").toLowerCase()}:${locale.toLowerCase()}:${wordToTranslate.toLowerCase()}`;

    // Check component-level cache first
    const cached = translationCacheRef.current.get(cacheKey);
    if (cached) {
      setWordTranslation(cached);
      setIsLoadingTranslation(false);
      inFlightTranslationRef.current = null;
      return;
    }

    let isCancelled = false;
    setIsLoadingTranslation(true);
    setWordTranslation(null);

    const promise = translateWordFromTree({
      word: wordToTranslate,
      contextPhrase: phrase,
      sourceLanguage,
      targetLanguage: locale,
    })
      .then((res) => {
        if (!isCancelled) {
          if (res?.translation) {
            setWordTranslation(res.translation);
            translationCacheRef.current.set(cacheKey, res.translation);
          }
          setIsLoadingTranslation(false);
        }
        return res?.translation || null;
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("Failed to load word translation:", err);
          setIsLoadingTranslation(false);
        }
        return null;
      });

    inFlightTranslationRef.current = promise;

    return () => {
      isCancelled = true;
    };
  }, [activeMenuWord, phrase, sourceLanguage, locale]);

  // Tokenize phrase into words & punctuation
  const tokens = useMemo(() => {
    return phrase.split(/(\s+)/);
  }, [phrase]);

  const handleSaveToDictionary = async (
    word: string,
    dictionaryId: string,
    dictTitle: string,
  ) => {
    setSavingWord(word);
    try {
      let translationToSave =
        wordTranslation?.trim() ||
        activeMenuWord?.savedInfo?.translation?.trim() ||
        undefined;

      // If translation is currently loading in flight, wait for it before falling back
      if (!translationToSave && inFlightTranslationRef.current) {
        try {
          const inFlightResult = await inFlightTranslationRef.current;
          if (inFlightResult?.trim()) {
            translationToSave = inFlightResult.trim();
          }
        } catch {
          // ignore error and proceed to server
        }
      }

      const res = await saveWordFromTree({
        word,
        contextPhrase: phrase,
        dictionaryId,
        translation: translationToSave,
      });

      onWordSaved(res.word, dictTitle);
      toast(
        t("toasts.wordSaved", {
          word,
          translation: res.word.translation,
          dict: dictTitle,
        }),
        "success",
      );
      setActiveMenuWord(null);
    } catch (err: unknown) {
      console.error("Failed to save word to dictionary:", err);
      toast(t("toasts.wordSaveFailed"), "error");
    } finally {
      setSavingWord(null);
    }
  };

  const handleRemoveFromDictionary = async (
    wordId: string,
    dictionaryId: string,
    dictTitle: string,
  ) => {
    if (!wordId) return;
    setDeletingWordId(wordId);
    try {
      await deleteWord(wordId);
      if (activeMenuWord) {
        onWordDeleted?.(wordId, activeMenuWord.word, dictionaryId);
      }
      toast(
        t("toasts.wordRemoved", {
          word: activeMenuWord?.displayWord || activeMenuWord?.word || "",
          dict: dictTitle,
        }),
        "success",
      );
    } catch (err: unknown) {
      console.error("Failed to delete word from dictionary:", err);
      toast(t("toasts.wordDeleteFailed"), "error");
    } finally {
      setDeletingWordId(null);
    }
  };

  return (
    <span className={cn("inline-block leading-relaxed", className)}>
      {tokens.map((token, idx) => {
        // Whitespace token
        if (/^\s+$/.test(token)) {
          return <span key={idx}>{token}</span>;
        }

        const cleaned = cleanToken(token);
        if (!cleaned) {
          return <span key={idx}>{token}</span>;
        }

        const savedInfo = savedWordsMap.get(cleaned);
        const isSaved = !!savedInfo;

        // Separate word characters from leading/trailing punctuation for precise styling
        const match = token.match(
          /^([^\p{L}\p{N}]*)([\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*)([^\p{L}\p{N}]*)$/u,
        );
        const leadingPunct = match ? match[1] : "";
        const wordText = match ? match[2] : token;
        const trailingPunct = match ? match[3] : "";

        if (isSaved) {
          return (
            <span key={idx} className="inline-block">
              {leadingPunct && <span>{leadingPunct}</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetRect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  setActiveMenuWord({
                    word: cleaned,
                    displayWord: wordText,
                    tokenIndex: idx,
                    rect: targetRect,
                    savedInfo,
                  });
                }}
                title={t("inDictionaryTooltip", {
                  dict: savedInfo.dictionaryTitle || "Saved",
                  translation: savedInfo.translation,
                })}
                className="font-bold text-amber-500 dark:text-amber-400 hover:text-amber-600 hover:underline decoration-dotted underline-offset-4 transition-colors cursor-pointer p-0 m-0 border-0 bg-transparent inline"
              >
                {wordText}
              </button>
              {trailingPunct && <span>{trailingPunct}</span>}
            </span>
          );
        }

        return (
          <span key={idx} className="inline-block">
            {leadingPunct && <span>{leadingPunct}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const targetRect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                setActiveMenuWord({
                  word: cleaned,
                  displayWord: wordText,
                  tokenIndex: idx,
                  rect: targetRect,
                });
              }}
              title={t("clickToSaveTooltip", { word: cleaned })}
              className="text-[var(--fg)] hover:text-primary-500 hover:underline decoration-dotted underline-offset-4 transition-colors cursor-pointer font-medium p-0 m-0 border-0 bg-transparent inline"
            >
              {wordText}
            </button>
            {trailingPunct && <span>{trailingPunct}</span>}
          </span>
        );
      })}

      {/* Floating Menu for picking destination dictionary rendered in Portal to escape canvas transforms */}
      {mounted &&
        activeMenuWord &&
        createPortal(
          <div
            ref={menuRef}
            data-dialogue-tree-menu="true"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: Math.min(
                window.innerHeight - 280,
                activeMenuWord.rect.bottom + 6,
              ),
              left: Math.max(
                16,
                Math.min(
                  window.innerWidth - 270,
                  activeMenuWord.rect.left - 20,
                ),
              ),
              zIndex: 99999,
            }}
            className="w-64 p-2 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          >
            {(() => {
              const currentSavedInfo = activeMenuWord
                ? savedWordsMap.get(activeMenuWord.word)
                : undefined;

              return (
                <>
                  <div className="px-2.5 py-1.5 border-b border-[var(--border-color)]/60 mb-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] uppercase font-bold text-[var(--fg)]/50 tracking-wider">
                        {t("saveWordTo")}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeakWord(
                            activeMenuWord.displayWord || activeMenuWord.word,
                          );
                        }}
                        title={t("pronouncePhrase")}
                        aria-label={t("pronouncePhrase")}
                        className={cn(
                          "p-1 -mr-1 -my-0.5 rounded-lg transition-all cursor-pointer flex items-center justify-center active:scale-90",
                          speakingWord ===
                            (activeMenuWord.displayWord || activeMenuWord.word)
                            ? "text-primary-500 bg-primary-500/15 animate-pulse"
                            : "text-[var(--fg)]/40 hover:text-primary-500 hover:bg-primary-500/10",
                        )}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5 min-w-0">
                      <span className="text-sm font-bold text-primary-500 break-words">
                        &quot;{activeMenuWord.displayWord || activeMenuWord.word}&quot;
                      </span>

                      {isLoadingTranslation ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--fg)]/40 font-normal">
                          <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
                        </span>
                      ) : wordTranslation ? (
                        <span className="text-xs font-semibold text-[var(--fg)]/80 flex items-center gap-1 animate-in fade-in duration-200 break-words">
                          <span className="text-[var(--fg)]/30 font-normal">•</span>
                          <span>{wordTranslation}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className="max-h-48 overflow-y-auto space-y-0.5 py-1 overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {userDictionaries.length === 0 ? (
                      <div className="py-2 px-1 text-center text-[11px] text-[var(--fg)]/50">
                        {t("toasts.needDicts")}
                      </div>
                    ) : (
                      userDictionaries.map((dict) => {
                        const isBusy = !!savingWord;
                        const wordToSave =
                          activeMenuWord.displayWord || activeMenuWord.word;

                        const matchingInstance =
                          currentSavedInfo?.instances?.find(
                            (inst) => inst.dictionaryId === dict.id,
                          ) ||
                          (currentSavedInfo?.dictionaryId === dict.id ||
                          currentSavedInfo?.dictionaryTitle === dict.title
                            ? {
                                id: currentSavedInfo.id || "",
                                dictionaryId: dict.id,
                                dictionaryTitle: dict.title,
                                translation: currentSavedInfo.translation,
                              }
                            : null);

                        const isAlreadyInThisDict = !!matchingInstance;
                        const savedWordId = matchingInstance?.id;

                        if (isAlreadyInThisDict) {
                          return (
                            <div
                              key={dict.id}
                              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 select-none cursor-default"
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-500/80" />
                                <span className="truncate">{dict.title}</span>
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <button
                                  type="button"
                                  disabled={deletingWordId === savedWordId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (savedWordId) {
                                      handleRemoveFromDictionary(
                                        savedWordId,
                                        dict.id,
                                        dict.title,
                                      );
                                    }
                                  }}
                                  title={t("removeWordFromDict")}
                                  aria-label={t("removeWordFromDict")}
                                  className="p-1 -my-1 rounded-md text-[var(--fg)]/50 hover:text-red-500 hover:bg-red-500/15 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                                >
                                  {deletingWordId === savedWordId ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                                  ) : (
                                    <X className="w-3 h-3 hover:scale-110 transition-transform" />
                                  )}
                                </button>
                                <span className="text-[10px] text-[var(--fg)]/40 uppercase font-mono ml-0.5">
                                  {dict.language}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={dict.id}
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleSaveToDictionary(
                                wordToSave,
                                dict.id,
                                dict.title,
                              )
                            }
                            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-[var(--fg)]/90 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary-500/70" />
                              <span className="truncate">{dict.title}</span>
                            </span>
                            <span className="text-[10px] text-[var(--fg)]/40 uppercase font-mono shrink-0">
                              {dict.language}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {savingWord && (
              <div className="flex items-center justify-center gap-1.5 pt-1.5 text-xs text-primary-500 font-medium border-t border-[var(--border-color)]/60">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{t("savingWord")}</span>
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
