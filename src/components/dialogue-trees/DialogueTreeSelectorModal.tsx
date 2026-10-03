"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Workflow,
  Plus,
  Trash2,
  GitBranch,
  ArrowRight,
  Loader2,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DialogueTree } from "@/lib/db/schema";
import { createDialogueTree, deleteDialogueTree } from "@/lib/api/dialogue-trees.api";
import { useToast } from "@/components/ui/Toast";
import { CEFR_LEVELS } from "./DialogueTreeSettingsModal";

export const SUPPORTED_LANGUAGES = [
  { code: "de", name: "German", flag: "🇩🇪", defaultPhrase: "Hallo, wie geht es dir?" },
  { code: "es", name: "Spanish", flag: "🇪🇸", defaultPhrase: "Hola, ¿cómo estás?" },
  { code: "fr", name: "French", flag: "🇫🇷", defaultPhrase: "Bonjour, comment vas-tu ?" },
  { code: "en", name: "English", flag: "🇬🇧", defaultPhrase: "Hello, how are you?" },
  { code: "tr", name: "Turkish", flag: "🇹🇷", defaultPhrase: "Merhaba, nasılsın?" },
];

export interface DialogueTreeSummary {
  id: string;
  title: string;
  language: string;
  level?: string | null;
  metaContext?: string | null;
  nodes?: any;
  updatedAt?: Date | string | null;
}

interface DialogueTreeSelectorModalProps {
  isOpen?: boolean;
  isInline?: boolean;
  onClose?: () => void;
  savedTrees: DialogueTreeSummary[];
  onSelectTree: (tree: DialogueTreeSummary) => void;
  onTreeCreated: (newTree: DialogueTree) => void;
  onTreeDeleted?: (treeId: string) => void;
}

export default function DialogueTreeSelectorModal({
  isOpen = false,
  isInline = false,
  onClose,
  savedTrees,
  onSelectTree,
  onTreeCreated,
  onTreeDeleted,
}: DialogueTreeSelectorModalProps) {
  const t = useTranslations("dialogueTrees");
  const tLanguages = useTranslations("settings.languages");
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"saved" | "create">(
    savedTrees.length > 0 ? "saved" : "create",
  );

  // Creation state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [treeTitle, setTreeTitle] = useState("");
  const [initialPhrase, setInitialPhrase] = useState("Hello, how are you?");
  const [level, setLevel] = useState<string>("B1");
  const [metaContext, setMetaContext] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTreeId, setDeletingTreeId] = useState<string | null>(null);

  if (!isInline && !isOpen) return null;

  const starterTemplates = [
    {
      title: t("templates.casualGreeting.title"),
      language: "en",
      initialPhrase: t("templates.casualGreeting.phrase"),
      description: t("templates.casualGreeting.description"),
    },
    {
      title: t("templates.orderingCafe.title"),
      language: "en",
      initialPhrase: t("templates.orderingCafe.phrase"),
      description: t("templates.orderingCafe.description"),
    },
    {
      title: t("templates.jobInterview.title"),
      language: "en",
      initialPhrase: t("templates.jobInterview.phrase"),
      description: t("templates.jobInterview.description"),
    },
  ];

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!treeTitle.trim()) {
      toast(t("toasts.enterTitle"), "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDialogueTree({
        title: treeTitle.trim(),
        language: selectedLanguage,
        initialPhrase: initialPhrase.trim() || undefined,
        level,
        metaContext: metaContext.trim() || undefined,
      });

      toast(t("toasts.treeCreated"), "success");
      onTreeCreated(res.tree);
      setTreeTitle("");
      setMetaContext("");
      setLevel("B1");
      if (!isInline && onClose) onClose();
    } catch (err) {
      console.error("Failed to create tree:", err);
      toast(t("toasts.createFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFromTemplate = async (template: {
    title: string;
    language: string;
    initialPhrase: string;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await createDialogueTree({
        title: template.title,
        language: template.language,
        initialPhrase: template.initialPhrase,
        level,
        metaContext: metaContext.trim() || undefined,
      });

      toast(t("toasts.templateCreated"), "success");
      onTreeCreated(res.tree);
      if (!isInline && onClose) onClose();
    } catch (err) {
      console.error("Failed to create template tree:", err);
      toast(t("toasts.createFailed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTree = async (e: React.MouseEvent, treeId: string) => {
    e.stopPropagation();
    if (!confirm(t("deleteConfirm"))) return;

    setDeletingTreeId(treeId);
    try {
      await deleteDialogueTree(treeId);
      if (onTreeDeleted) onTreeDeleted(treeId);
      toast(t("toasts.treeDeleted"), "info");
    } catch (err) {
      console.error("Failed to delete tree:", err);
      toast(t("toasts.deleteFailed"), "error");
    } finally {
      setDeletingTreeId(null);
    }
  };

  const modalContent = (
    <div
      className={cn(
        "relative w-full overflow-hidden flex flex-col rounded-3xl border border-[var(--border-color)]",
        isInline
          ? "max-w-4xl mx-auto bg-[var(--surface)]/50 backdrop-blur-xl shadow-xl"
          : "max-w-2xl max-h-[90vh] bg-[var(--bg)] shadow-2xl animate-in zoom-in-95 duration-150",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[var(--border-color)] bg-[var(--surface)]/60">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
            <Workflow className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[var(--fg)]">
              {t("select_or_create_tree")}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--fg)]/60 mt-0.5">
              {t("select_tree_subtitle")}
            </p>
          </div>
        </div>
        {!isInline && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--fg)]/50 hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border-color)] px-6 sm:px-8 pt-2 bg-[var(--surface)]/30">
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={cn(
            "px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "saved"
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-[var(--fg)]/60 hover:text-[var(--fg)]",
          )}
        >
          <GitBranch className="h-4 w-4" />
          <span>{t("tabs.saved_trees")}</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
            {savedTrees.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={cn(
            "px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "create"
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-[var(--fg)]/60 hover:text-[var(--fg)]",
          )}
        >
          <Plus className="h-4 w-4" />
          <span>{t("tabs.create_tree")}</span>
        </button>
      </div>

      {/* Body */}
      <div className={cn("p-6 sm:p-8 space-y-6", !isInline && "flex-1 overflow-y-auto")}>
        {activeTab === "saved" ? (
          /* SAVED TREES TAB */
          <div className="space-y-4">
            {savedTrees.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface)]/30">
                <Workflow className="h-12 w-12 mx-auto text-[var(--fg)]/30 mb-3" />
                <h3 className="font-semibold text-lg text-[var(--fg)]">{t("no_saved_trees")}</h3>
                <p className="text-sm text-[var(--fg)]/50 mt-1 max-w-md mx-auto">
                  {t("select_tree_subtitle")}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-all shadow-md shadow-violet-500/20 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  {t("tabs.create_tree")}
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {savedTrees.map((tree) => {
                  const langObj = SUPPORTED_LANGUAGES.find(
                    (l) => l.code === tree.language,
                  );
                  const nodeCount = Array.isArray(tree.nodes) ? tree.nodes.length : 0;
                  return (
                    <div
                      key={tree.id}
                      onClick={() => {
                        onSelectTree(tree);
                        if (!isInline && onClose) onClose();
                      }}
                      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]/70 hover:bg-[var(--surface)] hover:border-violet-500/50 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300">
                              <span>{langObj?.flag || "🌐"}</span>
                              <span>{langObj?.name || tree.language.toUpperCase()}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300">
                              {tree.level || "B1"}
                            </span>
                            {tree.metaContext && (
                              <span className="p-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400" title={t("metaContextActive")}>
                                <Sparkles className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTree(e, tree.id)}
                            disabled={deletingTreeId === tree.id}
                            className="p-1.5 rounded-lg text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title={t("deleteTree")}
                          >
                            {deletingTreeId === tree.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <h3 className="font-bold text-base text-[var(--fg)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                          {tree.title}
                        </h3>
                        {nodeCount > 0 && (
                          <p className="text-xs text-[var(--fg)]/50 mt-1">
                            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--border-color)]/50 flex items-center justify-between text-xs font-semibold text-violet-600 dark:text-violet-400">
                        <span>{t("openTree")}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* CREATE TREE TAB */
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-1.5">
                {t("treeTitleLabel")}
              </label>
              <input
                type="text"
                required
                value={treeTitle}
                onChange={(e) => setTreeTitle(e.target.value)}
                placeholder={t("treeTitlePlaceholder")}
                className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 text-sm font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-1.5">
                {t("targetLanguage")}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    title={tLanguages(l.code)}
                    onClick={() => {
                      setSelectedLanguage(l.code);
                      if (
                        !initialPhrase ||
                        SUPPORTED_LANGUAGES.some((lang) => lang.defaultPhrase === initialPhrase)
                      ) {
                        setInitialPhrase(l.defaultPhrase);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-medium transition-all cursor-pointer",
                      selectedLanguage === l.code
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 ring-2 ring-violet-500/20"
                        : "border-[var(--border-color)] hover:bg-[var(--surface)] text-[var(--fg)]/70",
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
                className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 text-sm font-medium transition-all"
              />
              <span className="text-[11px] text-[var(--fg)]/50 mt-1 block">
                {t("startingPhraseHint")}
              </span>
            </div>

            {/* Language Level Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/70">
                  <GraduationCap className="w-4 h-4 text-violet-500" />
                  <span>{t("levelLabel")}</span>
                </label>
                <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  {level} - {CEFR_LEVELS.find((l) => l.code === level)?.desc}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl.code}
                    type="button"
                    onClick={() => setLevel(lvl.code)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-2xl border text-xs font-medium transition-all cursor-pointer",
                      level === lvl.code
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 ring-2 ring-violet-500/20"
                        : "border-[var(--border-color)] hover:bg-[var(--surface)] text-[var(--fg)]/70",
                    )}
                  >
                    <span className="text-xs font-bold font-mono">{lvl.code}</span>
                    <span className="text-[9px] text-[var(--fg)]/50 mt-0.5 truncate max-w-full">
                      {lvl.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meta Context / Scenario Memory */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/70">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{t("metaContextLabel")}</span>
                </label>
                <span className="text-[11px] font-mono text-[var(--fg)]/50">
                  {metaContext.length} / 5000
                </span>
              </div>
              <p className="text-[11px] text-[var(--fg)]/50 mb-2 leading-relaxed">
                {t("metaContextHint")}
              </p>
              <textarea
                value={metaContext}
                onChange={(e) => setMetaContext(e.target.value.slice(0, 5000))}
                rows={4}
                maxLength={5000}
                className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 text-xs sm:text-sm font-normal leading-relaxed transition-all resize-y"
              />
            </div>

            {/* Quick Starter Templates */}
            <div>
              <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-2">
                Or Pick a Starter Template:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {starterTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCreateFromTemplate(tmpl)}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-violet-500/50 hover:shadow-md text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        {t("templateBadge", { number: idx + 1 })}
                      </span>
                      <Plus className="w-3.5 h-3.5 text-violet-500 group-hover:rotate-90 transition-transform" />
                    </div>
                    <h4 className="font-bold text-xs text-[var(--fg)] mb-0.5 line-clamp-1">
                      {tmpl.title}
                    </h4>
                    <p className="text-[10px] text-[var(--fg)]/50 line-clamp-1">
                      {tmpl.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              {!isInline && onClose && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--fg)]/70 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !treeTitle.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/25 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("creatingStatus")}</span>
                  </>
                ) : (
                  <span>{t("launch_tree")}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return modalContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      {modalContent}
    </div>
  );
}
