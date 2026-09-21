"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Languages,
  BookOpen,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  EnrichedDictionaryList,
  SavedPlaygroundPhrase,
} from "@/lib/api/playground.api";
import { createDictionaryList, deleteDictionaryList } from "@/lib/api/playground.api";
import { useToast } from "@/components/ui/Toast";

interface UserDictionarySummary {
  id: string;
  title: string;
  description: string | null;
  language: string;
  wordCount: number;
}

interface DictionaryListSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPacks: EnrichedDictionaryList[];
  userDictionaries: UserDictionarySummary[];
  onSelectPack: (pack: {
    id?: string;
    title: string;
    language: string;
    dictionaryIds: string[];
    positions?: Record<string, { x: number; y: number }> | null;
    savedPhrases?: SavedPlaygroundPhrase[] | null;
  }) => void;
  onPackCreated: (newPack: EnrichedDictionaryList) => void;
  onPackDeleted: (packId: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
];

export default function DictionaryListSelectorModal({
  isOpen,
  onClose,
  savedPacks,
  userDictionaries,
  onSelectPack,
  onPackCreated,
  onPackDeleted,
}: DictionaryListSelectorModalProps) {
  const t = useTranslations("playground");
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"saved" | "create">(
    savedPacks.length > 0 ? "saved" : "create",
  );

  // Creation state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("de");
  const [packTitle, setPackTitle] = useState("");
  const [selectedDictIds, setSelectedDictIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter user dictionaries matching the selected language
  const availableDictsForLang = userDictionaries.filter(
    (d) => d.language === selectedLanguage,
  );

  const toggleDictSelection = (id: string) => {
    setSelectedDictIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleQuickPlay = () => {
    if (selectedDictIds.length === 0) {
      toast(`${t("choose_dictionaries")}: ${t("select_dicts_hint")}`, "warning");
      return;
    }

    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
    const generatedTitle =
      packTitle.trim() ||
      `${langObj?.name || selectedLanguage.toUpperCase()} Pack (${selectedDictIds.length} dicts)`;

    onSelectPack({
      title: generatedTitle,
      language: selectedLanguage,
      dictionaryIds: selectedDictIds,
    });
    onClose();
  };

  const handleSaveAndLaunch = async () => {
    if (selectedDictIds.length === 0) {
      toast(`${t("choose_dictionaries")}: ${t("select_dicts_hint")}`, "warning");
      return;
    }

    if (!packTitle.trim()) {
      toast("Please provide a name for this pack.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDictionaryList({
        title: packTitle.trim(),
        language: selectedLanguage,
        dictionaryIds: selectedDictIds,
      });

      const enriched: EnrichedDictionaryList = {
        ...res.list,
        dictionaries: availableDictsForLang
          .filter((d) => selectedDictIds.includes(d.id))
          .map((d) => ({ id: d.id, title: d.title, language: d.language })),
        dictionaryCount: selectedDictIds.length,
      };

      onPackCreated(enriched);
      toast(`Pack created: "${enriched.title}"`, "success");

      onSelectPack({
        id: enriched.id,
        title: enriched.title,
        language: enriched.language,
        dictionaryIds: enriched.dictionaryIds,
        positions: enriched.positions,
        savedPhrases: enriched.savedPhrases,
      });
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create pack:", err);
      toast("Error creating pack. Please check your dictionaries.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePack = async (e: React.MouseEvent, packId: string) => {
    e.stopPropagation();
    if (!confirm(t("confirm_delete_pack"))) return;

    setDeletingPackId(packId);
    try {
      await deleteDictionaryList(packId);
      onPackDeleted(packId);
      toast("Pack deleted", "info");
    } catch (err) {
      console.error("Failed to delete pack:", err);
      toast("Could not delete pack", "error");
    } finally {
      setDeletingPackId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)] bg-[var(--surface)]/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">
                {t("select_or_create_pack")}
              </h2>
              <p className="text-xs text-[var(--fg)]/60">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--fg)]/50 hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)] px-6 pt-2 bg-[var(--surface)]/30">
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "saved"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-[var(--fg)]/60 hover:text-[var(--fg)]",
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span>{t("tabs.saved_packs")}</span>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
              {savedPacks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "create"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-[var(--fg)]/60 hover:text-[var(--fg)]",
            )}
          >
            <Plus className="h-4 w-4" />
            <span>{t("tabs.create_pack")}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "saved" ? (
            /* SAVED PACKS TAB */
            <div className="space-y-4">
              {savedPacks.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface)]/30">
                  <Layers className="h-12 w-12 mx-auto text-[var(--fg)]/30 mb-3" />
                  <h3 className="font-semibold text-lg">{t("no_saved_packs")}</h3>
                  <p className="text-sm text-[var(--fg)]/50 mt-1 max-w-md mx-auto">
                    Create a pack of your dictionaries with the same language to freely manipulate and mash them up!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("create")}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-all shadow-md shadow-primary-500/20"
                  >
                    <Plus className="h-4 w-4" />
                    {t("tabs.create_pack")}
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedPacks.map((pack) => {
                    const langObj = SUPPORTED_LANGUAGES.find(
                      (l) => l.code === pack.language,
                    );
                    return (
                      <div
                        key={pack.id}
                        onClick={() => {
                          onSelectPack({
                            id: pack.id,
                            title: pack.title,
                            language: pack.language,
                            dictionaryIds: pack.dictionaryIds,
                            positions: pack.positions,
                            savedPhrases: pack.savedPhrases,
                          });
                          onClose();
                        }}
                        className="group relative flex flex-col justify-between p-4 rounded-2xl border border-[var(--border-color)] bg-white/70 dark:bg-white/5 hover:border-primary-500/50 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-700 dark:text-primary-300">
                              <span>{langObj?.flag || "🌐"}</span>
                              <span>{langObj?.name || pack.language.toUpperCase()}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePack(e, pack.id)}
                              disabled={deletingPackId === pack.id}
                              className="p-1.5 rounded-lg text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title={t("delete_pack")}
                            >
                              {deletingPackId === pack.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <h4 className="font-bold text-base text-[var(--fg)] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                            {pack.title}
                          </h4>
                          <p className="text-xs text-[var(--fg)]/60 mt-1 line-clamp-2">
                            {pack.dictionaries?.map((d) => d.title).join(", ") ||
                              `${pack.dictionaryIds.length} dictionaries`}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]/60 text-xs font-medium text-primary-600 dark:text-primary-400">
                          <span>{pack.dictionaryIds.length} dictionaries</span>
                          <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            {t("launch_playground")}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* CREATE PACK / QUICK PLAY TAB */
            <div className="space-y-5">
              {/* Step 1: Language selector */}
              <div>
                <label className="block text-sm font-semibold text-[var(--fg)] mb-2">
                  1. {t("select_language")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const count = userDictionaries.filter(
                      (d) => d.language === lang.code,
                    ).length;
                    const isSelected = selectedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setSelectedDictIds([]); // Clear selection when language switches
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center",
                          isSelected
                            ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500/30 font-bold"
                            : "border-[var(--border-color)] bg-[var(--surface)]/50 text-[var(--fg)]/70 hover:bg-[var(--surface)]",
                        )}
                      >
                        <span className="text-2xl mb-1">{lang.flag}</span>
                        <span className="text-xs font-medium">{lang.name}</span>
                        <span className="text-[10px] text-[var(--fg)]/40 mt-0.5">
                          {count} dicts
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Dictionaries selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-[var(--fg)]">
                    2. {t("choose_dictionaries")}
                  </label>
                  <span className="text-xs text-[var(--fg)]/60">
                    {selectedDictIds.length} selected
                  </span>
                </div>

                {availableDictsForLang.length === 0 ? (
                  <div className="p-5 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface)]/20">
                    <p className="text-sm text-[var(--fg)]/60">
                      You don't have any dictionaries in this language yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableDictsForLang.map((dict) => {
                      const isChecked = selectedDictIds.includes(dict.id);
                      return (
                        <div
                          key={dict.id}
                          onClick={() => toggleDictSelection(dict.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                            isChecked
                              ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/40"
                              : "border-[var(--border-color)] bg-[var(--surface)]/30 hover:bg-[var(--surface)]",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex items-center justify-center h-5 w-5 rounded-md border transition-colors",
                                isChecked
                                  ? "border-primary-500 bg-primary-500 text-white"
                                  : "border-[var(--border-color)] bg-[var(--bg)]",
                              )}
                            >
                              {isChecked && <Check className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <span className="text-sm font-semibold block">
                                {dict.title}
                              </span>
                              {dict.description && (
                                <span className="text-xs text-[var(--fg)]/50 line-clamp-1">
                                  {dict.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border-color)] text-[var(--fg)]/60">
                            {dict.wordCount} words
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Optional Pack Name */}
              <div>
                <label className="block text-sm font-semibold text-[var(--fg)] mb-1.5">
                  3. {t("pack_name")} (optional for Quick Play)
                </label>
                <input
                  type="text"
                  value={packTitle}
                  onChange={(e) => setPackTitle(e.target.value)}
                  placeholder={t("pack_name_placeholder")}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg)] text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/30 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === "create" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-color)] bg-[var(--surface)]/50 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-[var(--fg)]/60 hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickPlay}
                disabled={selectedDictIds.length === 0}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg)] hover:bg-[var(--surface)] text-[var(--fg)] transition-all disabled:opacity-40"
              >
                {t("quick_play")}
              </button>
              <button
                type="button"
                onClick={handleSaveAndLaunch}
                disabled={selectedDictIds.length === 0 || isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-md shadow-primary-500/20 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("save_and_launch")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
