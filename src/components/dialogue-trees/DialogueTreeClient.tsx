"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { DialogueTree, Word } from "@/lib/db/schema";
import DialogueTreeSelector from "./DialogueTreeSelector";
import DialogueTreeCanvas from "./DialogueTreeCanvas";
import type { SavedWordInfo, UserDictionaryMeta } from "./DialoguePhraseWords";

interface DialogueTreeClientProps {
  initialTrees: DialogueTree[];
  initialTreeId?: string;
  initialUserDictionaries: UserDictionaryMeta[];
  initialSavedWords: Array<{
    id?: string;
    title: string;
    translation: string;
    dictionaryTitle?: string;
  }>;
  initialAiCredits: number;
  locale: string;
}

export default function DialogueTreeClient({
  initialTrees,
  initialTreeId,
  initialUserDictionaries,
  initialSavedWords,
  initialAiCredits,
  locale,
}: DialogueTreeClientProps) {
  const [trees, setTrees] = useState<DialogueTree[]>(initialTrees);
  const [aiCredits, setAiCredits] = useState<number>(initialAiCredits);

  // Active Tree selection
  const [activeTree, setActiveTree] = useState<DialogueTree | null>(() => {
    if (initialTreeId) {
      const found = initialTrees.find((t) => t.id === initialTreeId);
      if (found) return found;
    }
    return null;
  });

  // Saved words map (lowercase title -> info)
  const [savedWordsMap, setSavedWordsMap] = useState<Map<string, SavedWordInfo>>(
    () => {
      const map = new Map<string, SavedWordInfo>();
      initialSavedWords.forEach((w) => {
        if (w.title) {
          map.set(w.title.trim().toLowerCase(), w);
        }
      });
      return map;
    },
  );

  // When activeTree is open, disable body scroll for infinite canvas experience (like Playground)
  useEffect(() => {
    if (!activeTree) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeTree]);

  // Handle word saved to dictionary
  const handleWordSaved = useCallback(
    (newWord: Word, dictTitle: string) => {
      const cleaned = newWord.title.trim().toLowerCase();
      setSavedWordsMap((prev) => {
        const next = new Map(prev);
        next.set(cleaned, {
          id: newWord.id,
          title: newWord.title,
          translation: newWord.translation,
          dictionaryTitle: dictTitle,
        });
        return next;
      });
    },
    [],
  );

  // Handle tree created
  const handleTreeCreated = useCallback((newTree: DialogueTree) => {
    setTrees((prev) => [newTree, ...prev]);
  }, []);

  // Handle tree updated from auto-save
  const handleTreeUpdated = useCallback((updatedTree: DialogueTree) => {
    setTrees((prev) =>
      prev.map((t) => (t.id === updatedTree.id ? updatedTree : t)),
    );
    setActiveTree((curr) => (curr?.id === updatedTree.id ? updatedTree : curr));
  }, []);

  // Handle tree deleted
  const handleTreeDeleted = useCallback(
    (treeId: string) => {
      setTrees((prev) => prev.filter((t) => t.id !== treeId));
      if (activeTree?.id === treeId) {
        setActiveTree(null);
      }
    },
    [activeTree?.id],
  );

  if (!activeTree) {
    return (
      <main className="min-h-[calc(100vh-4rem)] w-full py-6 overflow-y-auto">
        <DialogueTreeSelector
          trees={trees}
          onSelectTree={(tree) => setActiveTree(tree)}
          onTreeCreated={handleTreeCreated}
          onTreeDeleted={handleTreeDeleted}
        />
      </main>
    );
  }

  return (
    <DialogueTreeCanvas
      key={activeTree.id}
      tree={activeTree}
      savedWordsMap={savedWordsMap}
      userDictionaries={initialUserDictionaries}
      aiCredits={aiCredits}
      onBackToSelector={() => setActiveTree(null)}
      onWordSaved={handleWordSaved}
      onTreeUpdated={handleTreeUpdated}
      onCreditsUpdated={(credits) => setAiCredits(credits)}
    />
  );
}
