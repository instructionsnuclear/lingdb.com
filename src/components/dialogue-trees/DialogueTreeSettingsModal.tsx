"use client";

import { useState, type FormEvent } from "react";
import { Settings, X, Loader2, Sparkles, GraduationCap, Check } from "lucide-react";
import type { DialogueTree } from "@/lib/db/schema";
import { updateDialogueTree } from "@/lib/api/dialogue-trees.api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

export const CEFR_LEVELS = [
  { code: "A1", desc: "Beginner" },
  { code: "A2", desc: "Elementary" },
  { code: "B1", desc: "Intermediate" },
  { code: "B2", desc: "Upper Int." },
  { code: "C1", desc: "Advanced" },
  { code: "C2", desc: "Mastery" },
] as const;

export interface DialogueTreeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: DialogueTree;
  onTreeUpdated: (updatedTree: DialogueTree) => void;
}

export default function DialogueTreeSettingsModal({
  isOpen,
  onClose,
  tree,
  onTreeUpdated,
}: DialogueTreeSettingsModalProps) {
  const t = useTranslations("dialogueTrees");
  const { toast } = useToast();

  const [title, setTitle] = useState(tree.title || "");
  const [level, setLevel] = useState<string>(tree.level || "B1");
  const [metaContext, setMetaContext] = useState<string>(tree.metaContext || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast(t("toasts.enterTitle"), "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateDialogueTree(tree.id, {
        title: title.trim(),
        level,
        metaContext: metaContext.trim() || null,
      });

      onTreeUpdated(res.tree);
      toast(t("toasts.settingsSaved"), "success");
      onClose();
    } catch (err) {
      console.error("Failed to update dialogue tree settings:", err);
      toast(t("toasts.settingsSaveFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const charCount = metaContext.length;
  const isNearLimit = charCount >= 4500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !isSaving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border-color)] shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[var(--border-color)] bg-[var(--surface)]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-heading text-[var(--fg)]">
                {t("treeSettings")}
              </h3>
              <p className="text-xs text-[var(--fg)]/60">
                {t("treeSettingsSubtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--fg)]/40 hover:text-[var(--fg)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Tree Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--fg)]/80 mb-1.5">
              {t("treeTitleLabel")}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("treeTitlePlaceholder")}
              className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm font-medium transition-all"
            />
          </div>

          {/* CEFR Language Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/80">
                <GraduationCap className="w-4 h-4 text-primary-500" />
                <span>{t("levelLabel")}</span>
              </label>
              <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                {level} - {CEFR_LEVELS.find((l) => l.code === level)?.desc}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CEFR_LEVELS.map((lvl) => {
                const isSelected = level === lvl.code;
                return (
                  <button
                    key={lvl.code}
                    type="button"
                    onClick={() => setLevel(lvl.code)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer relative",
                      isSelected
                        ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300 ring-2 ring-primary-500/25 shadow-sm"
                        : "border-[var(--border-color)] bg-[var(--bg)]/50 hover:bg-[var(--bg)] text-[var(--fg)]/70 hover:border-primary-500/30",
                    )}
                  >
                    <span className="text-sm font-extrabold font-mono tracking-tight">
                      {lvl.code}
                    </span>
                    <span className="text-[10px] text-[var(--fg)]/50 mt-0.5 truncate max-w-full">
                      {lvl.desc}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta Context / Scenario Memory */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/80">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{t("metaContextLabel")}</span>
              </label>
              <span
                className={cn(
                  "text-[11px] font-mono",
                  isNearLimit
                    ? "text-red-500 font-bold"
                    : "text-[var(--fg)]/50",
                )}
              >
                {charCount} / 5000
              </span>
            </div>

            <p className="text-[11px] text-[var(--fg)]/60 mb-2 leading-relaxed">
              {t("metaContextHint")}
            </p>

            <textarea
              value={metaContext}
              onChange={(e) => setMetaContext(e.target.value.slice(0, 5000))}
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-xs sm:text-sm font-normal leading-relaxed transition-all resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]/60">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--fg)]/70 hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-xs hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("savingSettings")}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t("saveSettings")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
