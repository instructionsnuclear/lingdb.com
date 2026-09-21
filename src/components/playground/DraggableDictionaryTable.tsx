"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Check,
  Loader2,
  X,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PlaygroundDictionary } from "@/lib/api/playground.api";
import type { Word } from "@/lib/db/schema";
import { createWord } from "@/lib/api/words.api";
import { useToast } from "@/components/ui/Toast";

interface DraggableDictionaryTableProps {
  dictionary: PlaygroundDictionary;
  position: { x: number; y: number };
  zIndex: number;
  zoom?: number;
  isSelectedWord: (wordId: string) => boolean;
  onToggleWord: (word: Word, dictionary: PlaygroundDictionary) => void;
  onWordAdded: (dictionaryId: string, newWord: Word) => void;
  onBringToFront: () => void;
}

export default function DraggableDictionaryTable({
  dictionary,
  position,
  zIndex,
  zoom = 1,
  isSelectedWord,
  onToggleWord,
  onWordAdded,
  onBringToFront,
}: DraggableDictionaryTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dictionary.id,
    });

  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [isSavingWord, setIsSavingWord] = useState(false);

  // Scale-compensated transform so dragging follows cursor 1:1 regardless of canvas zoom
  const scaledTransform = transform
    ? {
        ...transform,
        x: transform.x / zoom,
        y: transform.y / zoom,
      }
    : null;

  // Position & transform handling
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: scaledTransform ? CSS.Translate.toString(scaledTransform) : undefined,
    zIndex: isDragging ? 9999 : zIndex,
  };

  const handleAddWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTranslation.trim()) return;

    setIsSavingWord(true);
    try {
      const response = await createWord({
        dictionaryId: dictionary.id,
        title: newTitle.trim(),
        translation: newTranslation.trim(),
      });

      // Response contains word data or standard success format
      const createdWord = (response as { word?: Word })?.word || {
        id: crypto.randomUUID(),
        dictionaryId: dictionary.id,
        title: newTitle.trim(),
        translation: newTranslation.trim(),
        order: dictionary.words.length,
        lastModifiedById: null,
        createdAt: new Date(),
      };

      onWordAdded(dictionary.id, createdWord as Word);
      toast(`"${newTitle}" added to ${dictionary.title}`, "success");

      setNewTitle("");
      setNewTranslation("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add word from playground:", err);
      toast("Could not add word", "error");
    } finally {
      setIsSavingWord(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      data-draggable-table="true"
      style={style}
      onMouseDown={onBringToFront}
      className={cn(
        "w-80 sm:w-96 rounded-xl border bg-white/90 dark:bg-[#121132]/90 backdrop-blur-xl shadow-xl transition-shadow flex flex-col select-none overflow-hidden",
        isDragging
          ? "shadow-2xl ring-2 ring-primary-500 cursor-grabbing border-primary-500/50"
          : "border-[var(--border-color)] hover:shadow-2xl hover:border-primary-500/30",
      )}
    >
      {/* Draggable Table Header */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-primary-500/5 dark:bg-primary-500/10 rounded-t-xl cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-[var(--fg)]/40 shrink-0" />
          <h3
            className="font-bold text-sm sm:text-base text-[var(--fg)] truncate"
            title={dictionary.title}
          >
            {dictionary.title}
          </h3>
          <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-300">
            {dictionary.language}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-[var(--fg)]/50 font-medium mr-1">
            {dictionary.words.length}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddForm((prev) => !prev);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "p-1.5 rounded-lg text-xs font-medium transition-colors",
              showAddForm
                ? "bg-primary-500 text-white"
                : "bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20",
            )}
            title="Add word to this dictionary"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Quick Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddWordSubmit}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-3 border-b border-[var(--border-color)] bg-[var(--surface)]/60 animate-in slide-in-from-top-2 duration-150"
        >
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Word..."
              autoFocus
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <input
              type="text"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              placeholder="Translation..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs rounded-md text-[var(--fg)]/60 hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingWord || !newTitle.trim() || !newTranslation.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSavingWord ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add Word
            </button>
          </div>
        </form>
      )}

      {/* Table Content */}
      <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-[var(--border-color)]/50">
        {dictionary.words.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--fg)]/40">
            <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No words in this dictionary yet.
          </div>
        ) : (
          <div className="text-xs">
            {/* Table Column Headers */}
            <div className="sticky top-0 grid grid-cols-2 px-3 py-2 bg-[var(--surface)] font-semibold text-[var(--fg)]/60 border-b border-[var(--border-color)]/50 z-10">
              <span>Word</span>
              <span>Translation</span>
            </div>

            {/* Table Rows */}
            {dictionary.words.map((word) => {
              const selected = isSelectedWord(word.id);
              return (
                <div
                  key={word.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWord(word, dictionary);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={cn(
                    "grid grid-cols-2 px-3 py-2.5 cursor-pointer transition-all items-center",
                    selected
                      ? "bg-primary-500/15 text-primary-700 dark:text-primary-300 font-semibold ring-1 ring-inset ring-primary-500/40"
                      : "hover:bg-primary-500/5 text-[var(--fg)]/80 hover:text-[var(--fg)]",
                  )}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div
                      className={cn(
                        "h-3.5 w-3.5 rounded flex items-center justify-center border shrink-0 transition-colors",
                        selected
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-[var(--border-color)] bg-[var(--bg)]",
                      )}
                    >
                      {selected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span className="truncate">{word.title}</span>
                  </div>
                  <div className="truncate text-[var(--fg)]/60">
                    {word.translation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
