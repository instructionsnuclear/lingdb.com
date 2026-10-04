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
    dictionaryId?: string;
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

  // Saved words map (lowercase title -> info with multiple dictionary instances)
  const [savedWordsMap, setSavedWordsMap] = useState<Map<string, SavedWordInfo>>(
    () => {
      const map = new Map<string, SavedWordInfo>();
      initialSavedWords.forEach((w) => {
        if (w.title) {
          const key = w.title.trim().toLowerCase();
          const instance = {
            id: w.id || "",
            dictionaryId: w.dictionaryId || "",
            dictionaryTitle: w.dictionaryTitle || "",
            translation: w.translation || "",
          };
          const existing = map.get(key);
          if (existing) {
            const instances = existing.instances ? [...existing.instances] : [];
            if (!instances.some((i) => i.dictionaryId === instance.dictionaryId)) {
              instances.push(instance);
            }
            map.set(key, {
              ...existing,
              instances,
            });
          } else {
            map.set(key, {
              id: w.id,
              title: w.title,
              translation: w.translation,
              dictionaryId: w.dictionaryId,
              dictionaryTitle: w.dictionaryTitle,
              instances: instance.dictionaryId ? [instance] : [],
            });
          }
        }
      });
      return map;
    },
  );

  // When activeTree is open, disable body scroll for infinite canvas experience (like Playground)
  useEffect(() => {
    if (!activeTree) return;

    // Instantly scroll window to top so the canvas top controls bar is never clipped/hidden behind the sticky navbar
    const scrollToTop = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);

    // Guard against any subsequent unexpected window scrolls while in canvas mode
    window.addEventListener("scroll", scrollToTop, { passive: true });

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scrollToTop);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [activeTree]);

  // Handle word saved to dictionary
  const handleWordSaved = useCallback(
    (newWord: Word, dictTitle: string) => {
      const cleaned = newWord.title.trim().toLowerCase();
      setSavedWordsMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(cleaned);
        const instance = {
          id: newWord.id,
          dictionaryId: newWord.dictionaryId,
          dictionaryTitle: dictTitle,
          translation: newWord.translation,
        };
        if (existing) {
          const instances = existing.instances ? [...existing.instances] : [];
          const existingIdx = instances.findIndex(
            (i) => i.dictionaryId === newWord.dictionaryId,
          );
          if (existingIdx >= 0) {
            instances[existingIdx] = instance;
          } else {
            instances.push(instance);
          }
          next.set(cleaned, {
            ...existing,
            id: newWord.id,
            translation: newWord.translation,
            dictionaryTitle: dictTitle,
            dictionaryId: newWord.dictionaryId,
            instances,
          });
        } else {
          next.set(cleaned, {
            id: newWord.id,
            title: newWord.title,
            translation: newWord.translation,
            dictionaryTitle: dictTitle,
            dictionaryId: newWord.dictionaryId,
            instances: [instance],
          });
        }
        return next;
      });
    },
    [],
  );

  // Handle word deleted from dictionary
  const handleWordDeleted = useCallback(
    (wordId: string, cleanedWord: string, dictionaryId: string) => {
      setSavedWordsMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(cleanedWord);
        if (!existing) return prev;

        const remainingInstances = (existing.instances || []).filter(
          (i) => i.id !== wordId && i.dictionaryId !== dictionaryId,
        );

        if (remainingInstances.length === 0) {
          next.delete(cleanedWord);
        } else {
          const primary = remainingInstances[remainingInstances.length - 1];
          next.set(cleanedWord, {
            ...existing,
            id: primary.id,
            dictionaryId: primary.dictionaryId,
            dictionaryTitle: primary.dictionaryTitle,
            translation: primary.translation,
            instances: remainingInstances,
          });
        }
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

  const handleSelectTree = useCallback((tree: DialogueTree) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setActiveTree(tree);
  }, []);

  const handleBackToSelector = useCallback(() => {
    setActiveTree(null);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  if (!activeTree) {
    return (
      <main className="min-h-[calc(100vh-4rem)] w-full py-6 overflow-y-auto">
        <DialogueTreeSelector
          trees={trees}
          onSelectTree={handleSelectTree}
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
      onBackToSelector={handleBackToSelector}
      onWordSaved={handleWordSaved}
      onWordDeleted={handleWordDeleted}
      onTreeUpdated={handleTreeUpdated}
      onCreditsUpdated={(credits) => setAiCredits(credits)}
    />
  );
}
