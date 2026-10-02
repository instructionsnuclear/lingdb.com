"use client";

import { memo, useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Sparkles,
  Plus,
  Trash2,
  GitBranch,
  Pencil,
  Check,
  X,
  RefreshCw,
  Loader2,
  GripVertical,
} from "lucide-react";
import type { DialogueTreeNode, Word } from "@/lib/db/schema";
import DialoguePhraseWords, {
  type SavedWordInfo,
  type UserDictionaryMeta,
} from "./DialoguePhraseWords";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

interface DialogueTreeNodeCardProps {
  node: DialogueTreeNode;
  depth: number;
  isSelected: boolean;
  isLatest: boolean;
  isSuggestionsOpen: boolean;
  aiSuggestions?: string[];
  isGeneratingSuggestions: boolean;
  savedWordsMap: Map<string, SavedWordInfo>;
  userDictionaries: UserDictionaryMeta[];
  zoom?: number;
  zIndex?: number;
  onBringToFront?: () => void;
  onWordSaved: (word: Word, dictTitle: string) => void;
  onSelectNode: (nodeId: string) => void;
  onClickAddLink: (nodeId: string) => void;
  onAcceptSuggestion: (parentId: string, suggestionText: string) => void;
  onToggleSuggestions: (nodeId: string) => void;
  onCloseSuggestions: (nodeId: string) => void;
  onRegenerateSuggestions: (nodeId: string) => void;
  onUpdateNodeText: (nodeId: string, newText: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

function DialogueTreeNodeCard({
  node,
  depth,
  isSelected,
  isLatest,
  isSuggestionsOpen,
  aiSuggestions,
  isGeneratingSuggestions,
  savedWordsMap,
  userDictionaries,
  zoom = 1,
  zIndex = 10,
  onBringToFront,
  onWordSaved,
  onSelectNode,
  onClickAddLink,
  onAcceptSuggestion,
  onToggleSuggestions,
  onCloseSuggestions,
  onRegenerateSuggestions,
  onUpdateNodeText,
  onDeleteNode,
}: DialogueTreeNodeCardProps) {
  const t = useTranslations("dialogueTrees");
  const isRoot = node.parentId === null;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: node.id,
    });

  // Scale-compensated transform so dragging follows cursor 1:1 regardless of canvas zoom
  const scaledTransform = transform
    ? {
        ...transform,
        x: transform.x / zoom,
        y: transform.y / zoom,
      }
    : null;

  const posX = scaledTransform ? Math.round(node.x + scaledTransform.x) : node.x;
  const posY = scaledTransform ? Math.round(node.y + scaledTransform.y) : node.y;

  const cardStyle: React.CSSProperties = {
    transform: `translate3d(${posX}px, ${posY}px, 0)`,
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: isDragging ? 9999 : isSuggestionsOpen ? 50 : isSelected ? 30 : zIndex,
  };

  useEffect(() => {
    setEditText(node.text);
  }, [node.text]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setIsEditing(false);
    if (trimmed !== node.text) {
      onUpdateNodeText(node.id, trimmed);
    }
  };

  const speakerLabel = isRoot
    ? t("speakerRoot")
    : depth % 2 === 0
      ? t("speakerA")
      : t("speakerB");

  const speakerTheme = isRoot
    ? "border-primary-500/70 shadow-primary-500/10"
    : depth % 2 === 0
      ? "border-sky-500/50 shadow-sky-500/10"
      : "border-purple-500/50 shadow-purple-500/10";

  const badgeTheme = isRoot
    ? "bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300 border-primary-500/30"
    : depth % 2 === 0
      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300 border-sky-500/30"
      : "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 border-purple-500/30";

  return (
    <div
      ref={setNodeRef}
      data-dialogue-node={node.id}
      style={cardStyle}
      onMouseDown={() => onBringToFront?.()}
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(node.id);
      }}
      className="select-none transition-shadow duration-200"
    >
      <div className="relative group">
        {/* Phrase Card + Right Link Handle Wrapper (anchors the handle strictly to the phrase card's vertical center) */}
        <div className="relative">
          {/* Main Card */}
          <div
            className={cn(
              "w-[310px] rounded-3xl p-4 transition-all duration-200 backdrop-blur-2xl bg-[var(--surface)]/90 border-2 shadow-lg",
              speakerTheme,
              isSelected &&
                "ring-4 ring-primary-500/25 scale-[1.01] shadow-2xl",
              isDragging && "ring-2 ring-primary-500 shadow-2xl scale-[1.02] cursor-grabbing",
            )}
          >
          {/* Card Header (Drag handle like Playground tables) */}
          <div
            {...listeners}
            {...attributes}
            className="flex items-center justify-between gap-2 mb-2.5 cursor-grab active:cursor-grabbing rounded-xl p-1 -m-1 hover:bg-[var(--fg)]/5 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-[var(--fg)]/30 hover:text-[var(--fg)]/70 transition-colors shrink-0" />
              <span
                className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                  badgeTheme,
                )}
              >
                {speakerLabel}
              </span>

              {node.childrenIds && node.childrenIds.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--fg)]/50 font-medium px-1.5 py-0.5 rounded-md bg-[var(--bg)]/50">
                  <GitBranch className="w-3 h-3" />
                  {node.childrenIds.length}
                </span>
              )}
            </div>

            {/* Top Action Icons: Sparkles (AI ideas), Pencil (edit phrase), Trash (delete) */}
            <div
              className="flex items-center gap-1 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                  onToggleSuggestions(node.id);
                }}
                title={isSuggestionsOpen ? t("closeAiSuggestions") : t("showAiSuggestions")}
                className={cn(
                  "p-1 rounded-lg transition-colors cursor-pointer",
                  isSuggestionsOpen
                    ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-500/40"
                    : "text-[var(--fg)]/40 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30",
                )}
              >
                <Sparkles
                  className={cn(
                    "w-3.5 h-3.5",
                    isGeneratingSuggestions && "animate-spin text-amber-500",
                  )}
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                  setIsEditing((prev) => !prev);
                }}
                title={t("editPhrase")}
                className={cn(
                  "p-1 rounded-lg text-[var(--fg)]/40 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors cursor-pointer",
                  isEditing && "text-primary-500 bg-primary-50 dark:bg-primary-950/30",
                )}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {!isRoot && onDeleteNode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  title={t("deletePhraseBranch")}
                  className="p-1 rounded-lg text-[var(--fg)]/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Phrase content (inline editor when editing, or interactive words) */}
          {isEditing ? (
            <div
              className="mt-1 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <textarea
                rows={2}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditText(node.text);
                  }
                }}
                className="w-full p-2.5 text-sm font-semibold rounded-2xl border border-primary-500/50 bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none transition-all leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(node.text);
                  }}
                  className="p-1.5 rounded-xl text-[var(--fg)]/50 hover:bg-[var(--bg)] transition-colors cursor-pointer"
                  title={t("cancel")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-colors shadow-sm cursor-pointer"
                  title={t("savePhraseTooltip")}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t("save")}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-base font-semibold tracking-tight text-[var(--fg)] min-h-[2.5rem]">
              <DialoguePhraseWords
                phrase={node.text}
                savedWordsMap={savedWordsMap}
                userDictionaries={userDictionaries}
                onWordSaved={onWordSaved}
              />
            </div>
          )}
        </div>

        {/* ─── Outgoing Link Handle on the Right ─── */}
        <div
          className="absolute -right-10 top-1/2 -translate-y-1/2 flex items-center z-20 group/handle cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClickAddLink(node.id);
          }}
          title={t("addResponseTooltip")}
        >
          {/* Arrow connection line */}
          <div className="w-7 h-0.5 bg-primary-500/50 group-hover/handle:bg-primary-500 transition-colors relative">
            <div className="absolute right-0 -top-1 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-primary-500/70 group-hover/handle:border-l-primary-500" />
          </div>

          {/* Plus action pill */}
          <button
            type="button"
            className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover/handle:scale-110 transition-transform cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── AI Suggestions Dropdown / Drawer ─── */}
        {/* Rendered when open, floats above other cards with z-50 */}
        {isSuggestionsOpen &&
          (isGeneratingSuggestions ||
            (aiSuggestions && aiSuggestions.length > 0)) && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 w-[320px] p-3 rounded-2xl bg-[var(--surface)]/95 border border-primary-500/40 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 relative"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t("aiPotentialResponses")}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isGeneratingSuggestions}
                    onClick={() => onRegenerateSuggestions(node.id)}
                    title={t("regenerateSuggestions")}
                    className="p-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40 text-[var(--fg)]/60 hover:text-primary-500 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5",
                        isGeneratingSuggestions && "animate-spin",
                      )}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onCloseSuggestions(node.id)}
                    title={t("closeSuggestions")}
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--fg)]/50 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isGeneratingSuggestions ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-xs text-[var(--fg)]/60">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  <span>{t("generatingContinuations")}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {aiSuggestions?.map((sugg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAcceptSuggestion(node.id, sugg)}
                      className="w-full text-left p-2.5 rounded-xl border border-[var(--border-color)] hover:border-primary-500/60 bg-[var(--bg)]/60 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-all text-xs text-[var(--fg)] font-medium flex items-center justify-between gap-2 group/sugg cursor-pointer shadow-sm"
                    >
                      <span className="leading-snug">{sugg}</span>
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500/10 group-hover/sugg:bg-primary-500 group-hover/sugg:text-white text-primary-600 dark:text-primary-300 flex items-center justify-center transition-colors">
                        <Plus className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

export default memo(DialogueTreeNodeCard);
