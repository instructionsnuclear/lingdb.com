"use client";

import { useState, type FormEvent } from "react";
import { Workflow, X, Loader2 } from "lucide-react";
import type { DialogueTree } from "@/lib/db/schema";
import { createDialogueTree } from "@/lib/api/dialogue-trees.api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

export const LANGUAGES = [
  { code: "en", flag: "🇬🇧", defaultPhrase: "Hello, how are you?" },
  { code: "de", flag: "🇩🇪", defaultPhrase: "Hallo, wie geht es dir?" },
  { code: "fr", flag: "🇫🇷", defaultPhrase: "Bonjour, comment vas-tu ?" },
  { code: "es", flag: "🇪🇸", defaultPhrase: "Hola, ¿cómo estás?" },
  { code: "tr", flag: "🇹🇷", defaultPhrase: "Merhaba, nasılsın?" },
];

export interface CreateDialogueTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTreeCreated: (newTree: DialogueTree) => void;
  initialLanguage?: string;
  initialTitle?: string;
  initialPhrase?: string;
}

export default function CreateDialogueTreeModal({
  isOpen,
  onClose,
  onTreeCreated,
  initialLanguage = "en",
  initialTitle = "",
  initialPhrase: defaultPhrase,
}: CreateDialogueTreeModalProps) {
  const t = useTranslations("dialogueTrees");
  const tLanguages = useTranslations("settings.languages");
  const { toast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [language, setLanguage] = useState(initialLanguage);
  const [initialPhrase, setInitialPhrase] = useState(
    defaultPhrase ||
      LANGUAGES.find((l) => l.code === initialLanguage)?.defaultPhrase ||
      "Hello, how are you?",
  );

  if (!isOpen) return null;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast(t("toasts.enterTitle"), "error");
      return;
    }

    setIsCreating(true);
    try {
      const res = await createDialogueTree({
        title: title.trim(),
        language,
        initialPhrase: initialPhrase.trim() || undefined,
      });

      toast(t("toasts.treeCreated"), "success");
      onTreeCreated(res.tree);
      onClose();
      setTitle("");
    } catch (err) {
      console.error("Failed to create tree:", err);
      toast(t("toasts.createFailed"), "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !isCreating && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border-color)] shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-[var(--fg)]">
                {t("newTreeModalTitle")}
              </h3>
              <p className="text-xs text-[var(--fg)]/60">
                {t("newTreeModalSubtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isCreating}
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--fg)]/40 hover:text-[var(--fg)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-1.5">
              {t("treeTitleLabel")}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("treeTitlePlaceholder")}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-1.5">
              {t("targetLanguage")}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  title={tLanguages(l.code)}
                  onClick={() => {
                    setLanguage(l.code);
                    if (
                      !initialPhrase ||
                      LANGUAGES.some((lang) => lang.defaultPhrase === initialPhrase)
                    ) {
                      setInitialPhrase(l.defaultPhrase);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border text-xs font-medium transition-all cursor-pointer",
                    language === l.code
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 ring-2 ring-primary-500/20"
                      : "border-[var(--border-color)] hover:bg-[var(--bg)] text-[var(--fg)]/70",
                  )}
                >
                  <span className="text-xl mb-1">{l.flag}</span>
                  <span className="text-[10px] font-bold uppercase">{l.code}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-1.5">
              {t("initialPhrase")}
            </label>
            <input
              type="text"
              value={initialPhrase}
              onChange={(e) => setInitialPhrase(e.target.value)}
              placeholder={t("initialPhrasePlaceholder")}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm font-medium transition-all"
            />
            <span className="text-[11px] text-[var(--fg)]/50 mt-1 block">
              {t("startingPhraseHint")}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isCreating}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--fg)]/70 hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-xs hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("creatingStatus")}</span>
                </>
              ) : (
                <span>{t("createButton")}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
