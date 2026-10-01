"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Loader2, BookOpen } from "lucide-react";
import { saveWordFromTree } from "@/lib/api/dialogue-trees.api";
import { useToast } from "@/components/ui/Toast";
import type { Word } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

export interface UserDictionaryMeta {
  id: string;
  title: string;
  language: string;
  wordCount?: number;
}

export interface SavedWordInfo {
  id?: string;
  title: string;
  translation: string;
  dictionaryTitle?: string;
}

interface DialoguePhraseWordsProps {
  phrase: string;
  savedWordsMap: Map<string, SavedWordInfo>;
  userDictionaries: UserDictionaryMeta[];
  onWordSaved: (word: Word, dictTitle: string) => void;
  className?: string;
}

// Clean non-letter/digit edge characters for dictionary matching
function cleanToken(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
}

export default function DialoguePhraseWords({
  phrase,
  savedWordsMap,
  userDictionaries,
  onWordSaved,
  className,
}: DialoguePhraseWordsProps) {
  const t = useTranslations("dialogueTrees");
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeMenuWord, setActiveMenuWord] = useState<{
    word: string;
    tokenIndex: number;
    rect: DOMRect;
  } | null>(null);
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dictionary picker on outside click or wheel scroll
  useEffect(() => {
    if (!activeMenuWord) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuWord(null);
      }
    };
    const handleDismissOnScroll = () => {
      setActiveMenuWord(null);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("wheel", handleDismissOnScroll, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("wheel", handleDismissOnScroll);
    };
  }, [activeMenuWord]);

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
      const res = await saveWordFromTree({
        word,
        contextPhrase: phrase,
        dictionaryId,
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

        if (isSaved) {
          return (
            <span
              key={idx}
              title={t("inDictionaryTooltip", {
                dict: savedInfo.dictionaryTitle || "Saved",
                translation: savedInfo.translation,
              })}
              className="inline-block font-bold text-amber-500 dark:text-amber-400 hover:text-amber-600 transition-colors cursor-default"
            >
              {token}
            </span>
          );
        }

        // Separate word characters from leading/trailing punctuation for precise styling
        const match = token.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*)([^\p{L}\p{N}]*)$/u);
        const leadingPunct = match ? match[1] : "";
        const wordText = match ? match[2] : token;
        const trailingPunct = match ? match[3] : "";

        return (
          <span key={idx} className="inline-block">
            {leadingPunct && <span>{leadingPunct}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (userDictionaries.length === 0) {
                  toast(t("toasts.needDicts"), "info");
                  return;
                }
                const targetRect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                setActiveMenuWord({
                  word: cleaned,
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
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: Math.min(
                window.innerHeight - 260,
                activeMenuWord.rect.bottom + 6,
              ),
              left: Math.max(
                16,
                Math.min(
                  window.innerWidth - 240,
                  activeMenuWord.rect.left - 20,
                ),
              ),
              zIndex: 99999,
            }}
            className="w-56 p-2 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1.5 border-b border-[var(--border-color)]/60 mb-1">
              <p className="text-[10px] uppercase font-bold text-[var(--fg)]/50 tracking-wider">
                {t("saveWordTo")}
              </p>
              <p className="text-sm font-bold text-primary-500 truncate">
                &quot;{activeMenuWord.word}&quot;
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
              {userDictionaries.map((dict) => {
                const isBusy = savingWord === activeMenuWord.word;
                return (
                  <button
                    key={dict.id}
                    disabled={isBusy}
                    onClick={() =>
                      handleSaveToDictionary(
                        activeMenuWord.word,
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
                    <span className="text-[10px] text-[var(--fg)]/40 uppercase shrink-0 font-mono">
                      {dict.language}
                    </span>
                  </button>
                );
              })}
            </div>

            {savingWord === activeMenuWord.word && (
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
