"use client";

import { useState, type FormEvent } from "react";
import {
  Settings,
  X,
  Loader2,
  Sparkles,
  GraduationCap,
  Check,
  RotateCcw,
} from "lucide-react";
import { updateDictionaryList } from "@/lib/api/playground.api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";
import { CEFR_LEVELS } from "@/components/dialogue-trees/DialogueTreeSettingsModal";

export interface PlaygroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: {
    id?: string;
    title: string;
    language: string;
    metaContext?: string | null;
    level?: string | null;
  };
  onPackUpdated: (updated: {
    title: string;
    level: string;
    metaContext: string | null;
  }) => void;
  onResetLayout?: () => void;
}

export default function PlaygroundSettingsModal({
  isOpen,
  onClose,
  pack,
  onPackUpdated,
  onResetLayout,
}: PlaygroundSettingsModalProps) {
  const t = useTranslations("playground");
  const { toast } = useToast();

  const [title, setTitle] = useState(pack.title || "");
  const [level, setLevel] = useState<string>(pack.level || "B1");
  const [metaContext, setMetaContext] = useState<string>(pack.metaContext || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast("Please provide a name for this pack.", "warning");
      return;
    }

    setIsSaving(true);
    const cleanedMeta = metaContext.trim() || null;
    try {
      if (pack.id) {
        await updateDictionaryList(pack.id, {
          title: title.trim(),
          level,
          metaContext: cleanedMeta,
        });
      }

      onPackUpdated({
        title: title.trim(),
        level,
        metaContext: cleanedMeta,
      });

      toast(t("settings_saved"), "success");
      onClose();
    } catch (err) {
      console.error("Failed to update playground pack settings:", err);
      toast(t("settings_save_failed"), "error");
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
                {t("pack_settings")}
              </h3>
              <p className="text-xs text-[var(--fg)]/60">
                {t("pack_settings_subtitle")}
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
          {/* Pack Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--fg)]/80 mb-1.5">
              {t("pack_name")}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm font-medium transition-all"
            />
          </div>

          {/* CEFR Language Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/80">
                <GraduationCap className="w-4 h-4 text-primary-500" />
                <span>{t("level_label")}</span>
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

          {/* Scenario Meta Context / Memory Border */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/80">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{t("meta_context_label")}</span>
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
              {t("meta_context_hint")}
            </p>

            <textarea
              value={metaContext}
              onChange={(e) => setMetaContext(e.target.value.slice(0, 5000))}
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-xs sm:text-sm font-normal leading-relaxed transition-all resize-y"
            />
          </div>

          {/* Canvas Layout Reset (conveniently accessible inside settings) */}
          {onResetLayout && (
            <div className="pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)]/50">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--fg)]">
                    {t("reset_layout_title")}
                  </h4>
                  <p className="text-[11px] text-[var(--fg)]/50">
                    {t("reset_layout_desc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onResetLayout();
                    toast(t("layout_reset_toast"), "info");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-primary-500/10 text-xs font-semibold text-[var(--fg)]/70 hover:text-[var(--fg)] transition-colors active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("reset_layout")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]/60">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--fg)]/70 hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-xs hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("saving_settings")}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t("save_settings")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
