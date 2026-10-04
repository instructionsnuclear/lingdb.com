"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  X,
  Search,
  BookOpen,
  Check,
  Plus,
  Loader2,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface UserDictionarySummary {
  id: string;
  title: string;
  description: string | null;
  language: string;
  wordCount: number;
}

interface AddDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDictionaries: UserDictionarySummary[];
  existingDictionaryIds: string[];
  currentLanguage: string;
  onAddDictionaries: (selectedIds: string[]) => Promise<void> | void;
}

const LANGUAGE_META: Record<string, { name: string; flag: string }> = {
  de: { name: "German", flag: "🇩🇪" },
  es: { name: "Spanish", flag: "🇪🇸" },
  fr: { name: "French", flag: "🇫🇷" },
  en: { name: "English", flag: "🇬🇧" },
  tr: { name: "Turkish", flag: "🇹🇷" },
};

export default function AddDictionaryModal({
  isOpen,
  onClose,
  availableDictionaries,
  existingDictionaryIds,
  currentLanguage,
  onAddDictionaries,
}: AddDictionaryModalProps) {
  const t = useTranslations("playground");
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>(
    () => currentLanguage || "all",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedLanguageFilter(currentLanguage || "all");
      setSelectedIds([]);
      setIsSubmitting(false);
    }
  }, [isOpen, currentLanguage]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, handleKeyDown]);

  const existingSet = useMemo(
    () => new Set(existingDictionaryIds),
    [existingDictionaryIds],
  );

  // Categorize and filter dictionaries
  const { eligibleToAdd, alreadyAdded } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = availableDictionaries.filter((dict) => {
      // Language filter
      if (
        selectedLanguageFilter !== "all" &&
        dict.language !== selectedLanguageFilter
      ) {
        return false;
      }
      // Search filter
      if (q) {
        const matchesTitle = dict.title.toLowerCase().includes(q);
        const matchesDesc = dict.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });

    const eligible: UserDictionarySummary[] = [];
    const added: UserDictionarySummary[] = [];

    filtered.forEach((dict) => {
      if (existingSet.has(dict.id)) {
        added.push(dict);
      } else {
        eligible.push(dict);
      }
    });

    return { eligibleToAdd: eligible, alreadyAdded: added };
  }, [availableDictionaries, existingSet, searchQuery, selectedLanguageFilter]);

  const handleToggleSelect = (dictId: string) => {
    if (existingSet.has(dictId)) return;
    setSelectedIds((prev) =>
      prev.includes(dictId)
        ? prev.filter((id) => id !== dictId)
        : [...prev, dictId],
    );
  };

  const handleSelectAllEligible = () => {
    const allEligibleIds = eligibleToAdd.map((d) => d.id);
    setSelectedIds(allEligibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddDictionaries(selectedIds);
      onClose();
    } catch (err) {
      console.error("Failed to add dictionaries:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const currentLangMeta = LANGUAGE_META[currentLanguage] || {
    name: currentLanguage.toUpperCase(),
    flag: "🌐",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--fg)] shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)]/70 bg-[var(--bg)]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-lg sm:text-xl tracking-tight">
                {t("add_dictionaries_title")}
              </h2>
              <p className="text-xs text-[var(--fg)]/60 line-clamp-1">
                {t("add_dictionaries_desc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-[var(--fg)]/50 hover:text-[var(--fg)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-color)] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-[var(--border-color)]/60 bg-[var(--bg)]/30 space-y-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg)]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_dictionaries")}
              className="w-full pl-9 pr-9 py-2 rounded-xl text-sm bg-[var(--bg)] border border-[var(--border-color)] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-[var(--fg)] placeholder:text-[var(--fg)]/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--fg)]/40 hover:text-[var(--fg)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Language Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLanguageFilter(currentLanguage)}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap",
                selectedLanguageFilter === currentLanguage
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-[var(--bg)] border border-[var(--border-color)] text-[var(--fg)]/70 hover:text-[var(--fg)]",
              )}
            >
              <span>{currentLangMeta.flag}</span>
              <span>
                {t("filter_matching_language", {
                  lang: currentLangMeta.name,
                })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguageFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap",
                selectedLanguageFilter === "all"
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-[var(--bg)] border border-[var(--border-color)] text-[var(--fg)]/70 hover:text-[var(--fg)]",
              )}
            >
              {t("filter_all_languages")}
            </button>
          </div>
        </div>

        {/* Dictionaries List Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
          {/* Quick select helpers */}
          {eligibleToAdd.length > 0 && (
            <div className="flex items-center justify-between text-xs text-[var(--fg)]/60 pb-1">
              <span>
                {eligibleToAdd.length}{" "}
                {eligibleToAdd.length === 1 ? "dictionary" : "dictionaries"}{" "}
                available
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllEligible}
                  className="font-medium hover:text-primary-500 transition-colors"
                >
                  {t("select_all")}
                </button>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="font-medium hover:text-rose-500 transition-colors"
                  >
                    {t("clear_selection")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Eligible to add section */}
          {eligibleToAdd.length > 0 ? (
            <div className="space-y-2">
              {eligibleToAdd.map((dict) => {
                const isSelected = selectedIds.includes(dict.id);
                const langInfo = LANGUAGE_META[dict.language] || {
                  name: dict.language.toUpperCase(),
                  flag: "🌐",
                };

                return (
                  <div
                    key={dict.id}
                    onClick={() => handleToggleSelect(dict.id)}
                    className={cn(
                      "group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-primary-500/10 border-primary-500/50 shadow-sm"
                        : "bg-[var(--bg)]/70 border-[var(--border-color)] hover:border-primary-500/30 hover:bg-[var(--bg)]",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                          isSelected
                            ? "bg-primary-500 border-primary-500 text-white"
                            : "border-[var(--border-color)] group-hover:border-primary-500/50 bg-[var(--surface)]",
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[var(--fg)] truncate">
                            {dict.title}
                          </h3>
                        </div>
                        {dict.description && (
                          <p className="text-xs text-[var(--fg)]/60 line-clamp-1 mt-0.5">
                            {dict.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--fg)]/70 flex items-center gap-1">
                        <span>{langInfo.flag}</span>
                        <span className="uppercase text-[10px]">
                          {dict.language}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-[var(--fg)]/50">
                        {t("words_count", { count: dict.wordCount })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center px-4 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg)]/30">
              <BookOpen className="h-8 w-8 mx-auto text-[var(--fg)]/30 mb-2" />
              <p className="text-sm font-semibold text-[var(--fg)]/70">
                {searchQuery || selectedLanguageFilter !== "all"
                  ? t("no_dictionaries_found")
                  : t("all_already_added")}
              </p>
            </div>
          )}

          {/* Dictionaries Already in Playground Section */}
          {alreadyAdded.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]/50 mb-2 uppercase tracking-wider">
                <Info className="h-3.5 w-3.5 text-primary-500/70" />
                <span>
                  {t("already_in_playground")} ({alreadyAdded.length})
                </span>
              </div>
              <div className="space-y-1.5 opacity-60">
                {alreadyAdded.map((dict) => {
                  const langInfo = LANGUAGE_META[dict.language] || {
                    name: dict.language.toUpperCase(),
                    flag: "🌐",
                  };
                  return (
                    <div
                      key={dict.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[var(--border-color)]/70 bg-[var(--bg)]/40 cursor-not-allowed select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-5 h-5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-[var(--fg)]/80 truncate">
                            {dict.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {t("already_in_playground")}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--fg)]/60 flex items-center gap-1">
                          <span>{langInfo.flag}</span>
                          <span className="uppercase text-[10px]">
                            {dict.language}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-color)]/70 bg-[var(--bg)]/60 shrink-0">
          <div className="text-xs font-semibold text-[var(--fg)]/70">
            {selectedIds.length > 0 ? (
              <span className="text-primary-600 dark:text-primary-400 font-bold">
                {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "dictionary" : "dictionaries"}{" "}
                selected
              </span>
            ) : (
              <span>Select dictionaries to add</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] hover:bg-[var(--surface)] text-[var(--fg)]/70 hover:text-[var(--fg)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.length === 0 || isSubmitting}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95",
                selectedIds.length > 0 && !isSubmitting
                  ? "bg-primary-500 hover:bg-primary-600 text-white shadow-primary-500/25"
                  : "bg-[var(--surface)] border border-[var(--border-color)] text-[var(--fg)]/40 cursor-not-allowed shadow-none",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>
                    {t("add_selected_count", {
                      count: selectedIds.length,
                    })}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
