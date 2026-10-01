"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Workflow,
  Plus,
  Trash2,
  ArrowRight,
  GitBranch,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { DialogueTree } from "@/lib/db/schema";
import { createDialogueTree, deleteDialogueTree } from "@/lib/api/dialogue-trees.api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";
import CreateDialogueTreeModal, { LANGUAGES } from "./CreateDialogueTreeModal";

interface DialogueTreeSelectorProps {
  trees: DialogueTree[];
  onSelectTree: (tree: DialogueTree) => void;
  onTreeCreated: (newTree: DialogueTree) => void;
  onTreeDeleted: (treeId: string) => void;
}

export default function DialogueTreeSelector({
  trees,
  onSelectTree,
  onTreeCreated,
  onTreeDeleted,
}: DialogueTreeSelectorProps) {
  const t = useTranslations("dialogueTrees");
  const tLanguages = useTranslations("settings.languages");
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const starterTemplates = useMemo(
    () => [
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
    ],
    [t],
  );

  const handleCreateFromTemplate = async (template: {
    title: string;
    language: string;
    initialPhrase: string;
    description: string;
  }) => {
    setIsCreating(true);
    try {
      const res = await createDialogueTree({
        title: template.title,
        language: template.language,
        initialPhrase: template.initialPhrase,
      });
      onTreeCreated(res.tree);
      toast(t("toasts.templateCreated"), "success");
      onSelectTree(res.tree);
    } catch (err) {
      console.error("Failed to create template tree:", err);
      toast(t("toasts.createFailed"), "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("deleteConfirm"))) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteDialogueTree(id);
      onTreeDeleted(id);
      toast(t("toasts.treeDeleted"), "info");
    } catch (err) {
      console.error("Failed to delete tree:", err);
      toast(t("toasts.deleteFailed"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 pb-8 border-b border-[var(--border-color)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("badge")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-[var(--fg)] tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[var(--fg)]/70 max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>{t("createNew")}</span>
        </button>
      </div>

      {/* Existing Trees Grid */}
      {trees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trees.map((tree) => {
            const langObj = LANGUAGES.find((l) => l.code === tree.language);
            const nodeCount = tree.nodes?.length || 0;
            const rootPhrase = tree.nodes?.[0]?.text || "";
            const localizedLang = tLanguages(tree.language);

            return (
              <div
                key={tree.id}
                onClick={() => onSelectTree(tree)}
                className="group relative flex flex-col justify-between p-6 rounded-3xl bg-[var(--surface)]/80 hover:bg-[var(--surface)] border border-[var(--border-color)] hover:border-primary-500/50 shadow-md hover:shadow-2xl transition-all duration-200 cursor-pointer backdrop-blur-xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" title={localizedLang}>
                        {langObj?.flag || "🌐"}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-500/20">
                        {tree.language}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === tree.id}
                      onClick={(e) => handleDelete(tree.id, e)}
                      title={t("deleteTree")}
                      className="p-1.5 rounded-xl text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {deletingId === tree.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-xl font-bold font-heading text-[var(--fg)] tracking-tight mb-2 group-hover:text-primary-500 transition-colors">
                    {tree.title}
                  </h3>

                  {rootPhrase && (
                    <p className="text-xs text-[var(--fg)]/60 line-clamp-2 italic mb-4">
                      &quot;{rootPhrase}&quot;
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--fg)]/60">
                  <span className="flex items-center gap-1.5 font-medium">
                    <GitBranch className="w-3.5 h-3.5 text-primary-500" />
                    <span>{t("nodeCount", { count: nodeCount })}</span>
                  </span>

                  <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>{t("openTree")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state with starter templates */
        <div className="text-center py-12 px-4 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)]/50 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-3xl bg-primary-500/10 text-primary-500 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold font-heading text-[var(--fg)] mb-2">
            {t("noTreesTitle")}
          </h2>
          <p className="text-sm text-[var(--fg)]/60 max-w-md mx-auto mb-8">
            {t("noTreesDesc")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left mb-6">
            {starterTemplates.map((tmpl, idx) => (
              <div
                key={idx}
                onClick={() => handleCreateFromTemplate(tmpl)}
                className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-primary-500/50 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary-500">
                    {t("templateBadge", { number: idx + 1 })}
                  </span>
                  <Plus className="w-4 h-4 text-primary-500 group-hover:rotate-90 transition-transform" />
                </div>
                <h4 className="font-bold text-sm text-[var(--fg)] mb-1">
                  {tmpl.title}
                </h4>
                <p className="text-xs text-[var(--fg)]/60 line-clamp-2">
                  {tmpl.description}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t("createCustomTree")}</span>
          </button>
        </div>
      )}

      {/* ─── Create Tree Modal ─── */}
      <CreateDialogueTreeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTreeCreated={(tree) => {
          onTreeCreated(tree);
          onSelectTree(tree);
        }}
      />
    </div>
  );
}
