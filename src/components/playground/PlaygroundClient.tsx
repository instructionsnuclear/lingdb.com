"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/tanstack/query-keys";
import { useToast } from "@/components/ui/Toast";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import {
  Layers,
  Plus,
  Loader2,
  BookOpen,
} from "lucide-react";

import DictionaryListSelectorModal from "./DictionaryListSelectorModal";
import PlaygroundCanvas from "./PlaygroundCanvas";
import PlaygroundBottomDock, { SelectedWordItem } from "./PlaygroundBottomDock";
import SavedPhrasesSidePanel from "./SavedPhrasesSidePanel";
import {
  getPlaygroundDictionaries,
  generatePlaygroundPhrases,
  updateDictionaryList,
  updateDictionaryListSavedPhrases,
  type EnrichedDictionaryList,
  type PlaygroundDictionary,
  type GeneratedPhrase,
  type SavedPlaygroundPhrase,
} from "@/lib/api/playground.api";
import type { Word } from "@/lib/db/schema";

interface UserDictionarySummary {
  id: string;
  title: string;
  description: string | null;
  language: string;
  wordCount: number;
}

interface PlaygroundClientProps {
  locale: string;
  initialUserDictionaries: UserDictionarySummary[];
  initialSavedPacks: EnrichedDictionaryList[];
  initialPackId?: string;
  initialQuickPlay?: {
    title: string;
    language: string;
    dictionaryIds: string[];
  };
  aiCredits: number;
}

export default function PlaygroundClient({
  locale,
  initialUserDictionaries,
  initialSavedPacks,
  initialPackId,
  initialQuickPlay,
  aiCredits: initialAiCredits,
}: PlaygroundClientProps) {
  const t = useTranslations("playground");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);

  const [savedPacks, setSavedPacks] =
    useState<EnrichedDictionaryList[]>(initialSavedPacks);
  const [currentCredits, setCurrentCredits] = useState<number>(initialAiCredits);

  // Active pack selection (restores URL packId or quick play if provided; otherwise starts null so selector modal/view opens first)
  const [activePack, setActivePack] = useState<{
    id?: string;
    title: string;
    language: string;
    dictionaryIds: string[];
    positions?: Record<string, { x: number; y: number }> | null;
    savedPhrases?: SavedPlaygroundPhrase[] | null;
  } | null>(() => {
    if (initialPackId) {
      const found = initialSavedPacks.find((p) => p.id === initialPackId);
      if (found) {
        return {
          id: found.id,
          title: found.title,
          language: found.language,
          dictionaryIds: found.dictionaryIds,
          positions: found.positions,
          savedPhrases: found.savedPhrases,
        };
      }
    }
    if (initialQuickPlay && initialQuickPlay.dictionaryIds.length > 0) {
      return {
        title: initialQuickPlay.title,
        language: initialQuickPlay.language,
        dictionaryIds: initialQuickPlay.dictionaryIds,
      };
    }
    return null;
  });

  // Clean up legacy localStorage key if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("lingdb_last_active_pack_id");
      } catch {
        // ignore
      }
    }
  }, []);

  // Disable page/body scroll on playground only when activePack is loaded for infinite canvas camera
  useEffect(() => {
    if (!activePack) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activePack]);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

  // Selected words across dictionaries
  const [selectedWords, setSelectedWords] = useState<SelectedWordItem[]>([]);

  // Generated AI phrases
  const [phrases, setPhrases] = useState<GeneratedPhrase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Local cache of dictionaries on canvas
  const [canvasDictionaries, setCanvasDictionaries] = useState<
    PlaygroundDictionary[]
  >([]);

  // Fetch dictionary data with words for the active pack
  const { data: dictData, isLoading: isLoadingDicts } = useQuery({
    queryKey: qk.playground.dictionaries(activePack?.dictionaryIds || []),
    queryFn: () =>
      getPlaygroundDictionaries(activePack?.dictionaryIds || []),
    enabled: !!activePack && activePack.dictionaryIds.length > 0,
  });

  useEffect(() => {
    if (dictData?.dictionaries) {
      setCanvasDictionaries(dictData.dictionaries);
    }
  }, [dictData]);

  // Entrance GSAP animation
  useGSAP(
    () => {
      if (!rootRef.current) return;
      gsap.from(".playground-anim", {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.5,
        ease: "power2.out",
      });
    },
    { scope: rootRef, dependencies: [activePack] },
  );

  // Toggle word selection
  const handleToggleWord = useCallback(
    (word: Word, dictionary: PlaygroundDictionary) => {
      setSelectedWords((prev) => {
        const exists = prev.some((w) => w.wordId === word.id);
        if (exists) {
          return prev.filter((w) => w.wordId !== word.id);
        } else {
          return [
            ...prev,
            {
              wordId: word.id,
              title: word.title,
              translation: word.translation,
              dictionaryId: dictionary.id,
              dictionaryTitle: dictionary.title,
            },
          ];
        }
      });
    },
    [],
  );

  const isSelectedWord = useCallback(
    (wordId: string) => selectedWords.some((w) => w.wordId === wordId),
    [selectedWords],
  );

  const handleRemoveWord = useCallback((wordId: string) => {
    setSelectedWords((prev) => prev.filter((w) => w.wordId !== wordId));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedWords([]);
  }, []);

  const handlePositionsUpdated = useCallback(
    (newPositions: Record<string, { x: number; y: number }>) => {
      if (!activePack?.id) return;
      setActivePack((prev) =>
        prev ? { ...prev, positions: newPositions } : null,
      );
      setSavedPacks((prev) =>
        prev.map((p) =>
          p.id === activePack.id ? { ...p, positions: newPositions } : p,
        ),
      );
    },
    [activePack?.id],
  );

  // Toggle saving a generated phrase for the active dictionary list
  const currentSavedPhrases = activePack?.savedPhrases || [];

  const handleToggleSavePhrase = useCallback(
    async (phraseObj: GeneratedPhrase) => {
      if (!activePack?.id) return;

      const existingIndex = currentSavedPhrases.findIndex(
        (p) => p.phrase === phraseObj.phrase,
      );

      let nextPhrases: SavedPlaygroundPhrase[];
      if (existingIndex >= 0) {
        nextPhrases = currentSavedPhrases.filter(
          (_, idx) => idx !== existingIndex,
        );
        toast("Phrase removed from saved phrases", "info");
      } else {
        const newPhrase: SavedPlaygroundPhrase = {
          id: crypto.randomUUID(),
          phrase: phraseObj.phrase,
          translation: phraseObj.translation,
          matchedWords: phraseObj.matchedWords || [],
          context: phraseObj.context,
          createdAt: new Date().toISOString(),
        };
        nextPhrases = [newPhrase, ...currentSavedPhrases];
        toast("Phrase saved to playground!", "success");
        setIsSidePanelOpen(true);
      }

      setActivePack((prev) =>
        prev ? { ...prev, savedPhrases: nextPhrases } : null,
      );
      setSavedPacks((prev) =>
        prev.map((p) =>
          p.id === activePack.id ? { ...p, savedPhrases: nextPhrases } : p,
        ),
      );

      try {
        await updateDictionaryListSavedPhrases(activePack.id, nextPhrases);
      } catch (err) {
        console.error("Failed to save phrase to database:", err);
        toast("Could not save phrase to database", "error");
      }
    },
    [activePack?.id, currentSavedPhrases, toast],
  );

  const handleDeleteSavedPhrase = useCallback(
    async (phraseId: string) => {
      if (!activePack?.id) return;
      const nextPhrases = currentSavedPhrases.filter((p) => p.id !== phraseId);

      setActivePack((prev) =>
        prev ? { ...prev, savedPhrases: nextPhrases } : null,
      );
      setSavedPacks((prev) =>
        prev.map((p) =>
          p.id === activePack.id ? { ...p, savedPhrases: nextPhrases } : p,
        ),
      );
      toast("Phrase removed", "info");

      try {
        await updateDictionaryListSavedPhrases(activePack.id, nextPhrases);
      } catch (err) {
        console.error("Failed to delete phrase from database:", err);
      }
    },
    [activePack?.id, currentSavedPhrases, toast],
  );

  const handleClearAllSavedPhrases = useCallback(async () => {
    if (!activePack?.id) return;
    setActivePack((prev) => (prev ? { ...prev, savedPhrases: [] } : null));
    setSavedPacks((prev) =>
      prev.map((p) =>
        p.id === activePack.id ? { ...p, savedPhrases: [] } : p,
      ),
    );
    toast("All saved phrases cleared", "info");

    try {
      await updateDictionaryListSavedPhrases(activePack.id, []);
    } catch (err) {
      console.error("Failed to clear saved phrases in database:", err);
    }
  }, [activePack?.id, toast]);

  // Update a dictionary when a new word is added from canvas or suggestions
  const handleWordAdded = useCallback(
    (dictionaryId: string, newWord: Word) => {
      setCanvasDictionaries((prev) =>
        prev.map((dict) => {
          if (dict.id === dictionaryId) {
            // Check if already in list
            if (dict.words.some((w) => w.id === newWord.id)) return dict;
            return {
              ...dict,
              words: [...dict.words, newWord],
            };
          }
          return dict;
        }),
      );

      // Invalidate relevant query keys
      queryClient.invalidateQueries({
        queryKey: qk.words.list(dictionaryId),
      });
      queryClient.invalidateQueries({
        queryKey: qk.dictionaries.detail(dictionaryId),
      });
    },
    [queryClient],
  );

  // Add existing dictionaries to active playground
  const handleAddDictionaries = useCallback(
    async (dictionaryIdsToAdd: string[]) => {
      if (!activePack || dictionaryIdsToAdd.length === 0) return;

      const uniqueToAdd = dictionaryIdsToAdd.filter(
        (id) => !activePack.dictionaryIds.includes(id),
      );
      if (uniqueToAdd.length === 0) return;

      const nextDictionaryIds = [...activePack.dictionaryIds, ...uniqueToAdd];

      // Stagger new card positions on canvas
      const cardWidth = 380;
      const cardHeight = 360;
      const gap = 32;
      const startX = 64;
      const startY = 48;

      const nextPositions: Record<string, { x: number; y: number }> = {
        ...(activePack.positions || {}),
      };

      const currentTotal = activePack.dictionaryIds.length;
      uniqueToAdd.forEach((dictId, idx) => {
        const slotIndex = currentTotal + idx;
        const col = slotIndex % 3;
        const row = Math.floor(slotIndex / 3);
        nextPositions[dictId] = {
          x: startX + col * (cardWidth + gap),
          y: startY + row * (cardHeight + gap),
        };
      });

      // Synchronize localStorage position cache immediately
      if (activePack.id && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `lingdb_playground_positions_${activePack.id}`,
            JSON.stringify(nextPositions),
          );
        } catch {}
      }

      // Optimistically fetch new dictionaries so words load seamlessly
      try {
        const newDictsRes = await getPlaygroundDictionaries(uniqueToAdd);
        if (newDictsRes?.dictionaries) {
          setCanvasDictionaries((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const fresh = newDictsRes.dictionaries.filter(
              (d) => !existingIds.has(d.id),
            );
            return [...prev, ...fresh];
          });
        }
      } catch (err) {
        console.warn("Could not pre-fetch newly added dictionaries:", err);
      }

      // Update active pack in state
      setActivePack((prev) =>
        prev
          ? {
              ...prev,
              dictionaryIds: nextDictionaryIds,
              positions: nextPositions,
            }
          : null,
      );

      // If active pack is a saved pack, persist to database
      if (activePack.id) {
        const addedDictMeta = initialUserDictionaries
          .filter((d) => uniqueToAdd.includes(d.id))
          .map((d) => ({ id: d.id, title: d.title, language: d.language }));

        setSavedPacks((prev) =>
          prev.map((p) => {
            if (p.id === activePack.id) {
              const updatedDicts = [
                ...(p.dictionaries || []),
                ...addedDictMeta.filter(
                  (meta) => !p.dictionaries?.some((d) => d.id === meta.id),
                ),
              ];
              return {
                ...p,
                dictionaryIds: nextDictionaryIds,
                positions: nextPositions,
                dictionaries: updatedDicts,
                dictionaryCount: updatedDicts.length,
              };
            }
            return p;
          }),
        );

        try {
          await updateDictionaryList(activePack.id, {
            dictionaryIds: nextDictionaryIds,
            positions: nextPositions,
          });
          queryClient.invalidateQueries({
            queryKey: qk.playground.lists,
          });
        } catch (err) {
          console.error("Failed to update dictionary pack in database:", err);
          toast("Failed to save changes to server", "error");
        }
      }

      toast(t("dictionaries_added_success"), "success");
    },
    [activePack, initialUserDictionaries, queryClient, t, toast],
  );

  // Remove dictionary from active playground
  const handleRemoveDictionary = useCallback(
    async (dictionaryIdToRemove: string) => {
      if (!activePack) return;

      if (activePack.dictionaryIds.length <= 1) {
        toast(t("min_one_dictionary_warning"), "warning");
        return;
      }

      const nextDictionaryIds = activePack.dictionaryIds.filter(
        (id) => id !== dictionaryIdToRemove,
      );

      // Clean up position record for removed dictionary
      const nextPositions = { ...(activePack.positions || {}) };
      delete nextPositions[dictionaryIdToRemove];

      // Clean up localStorage position cache
      if (activePack.id && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `lingdb_playground_positions_${activePack.id}`,
            JSON.stringify(nextPositions),
          );
        } catch {}
      }

      // Remove from canvas immediately
      setCanvasDictionaries((prev) =>
        prev.filter((d) => d.id !== dictionaryIdToRemove),
      );

      // Remove any selected words belonging to this dictionary in bottom dock
      setSelectedWords((prev) =>
        prev.filter((w) => w.dictionaryId !== dictionaryIdToRemove),
      );

      // Update active pack state
      setActivePack((prev) =>
        prev
          ? {
              ...prev,
              dictionaryIds: nextDictionaryIds,
              positions: nextPositions,
            }
          : null,
      );

      // Persist to database if saved pack
      if (activePack.id) {
        setSavedPacks((prev) =>
          prev.map((p) => {
            if (p.id === activePack.id) {
              const updatedDicts = (p.dictionaries || []).filter(
                (d) => d.id !== dictionaryIdToRemove,
              );
              return {
                ...p,
                dictionaryIds: nextDictionaryIds,
                positions: nextPositions,
                dictionaries: updatedDicts,
                dictionaryCount: updatedDicts.length,
              };
            }
            return p;
          }),
        );

        try {
          await updateDictionaryList(activePack.id, {
            dictionaryIds: nextDictionaryIds,
            positions: nextPositions,
          });
          queryClient.invalidateQueries({
            queryKey: qk.playground.lists,
          });
        } catch (err) {
          console.error("Failed to remove dictionary from pack in database:", err);
          toast("Failed to save changes to server", "error");
        }
      }

      toast(t("dictionary_removed_success"), "info");
    },
    [activePack, queryClient, t, toast],
  );

  // Generate AI phrases using selected words
  const handleGeneratePhrases = async () => {
    if (selectedWords.length === 0 || !activePack) return;

    if (currentCredits <= 0) {
      toast(t("no_credits_error"), "warning");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generatePlaygroundPhrases({
        words: selectedWords.map((w) => ({
          title: w.title,
          translation: w.translation,
          dictionaryId: w.dictionaryId,
        })),
        language: activePack.language,
        dictionaries: canvasDictionaries.map((d) => ({
          id: d.id,
          title: d.title,
        })),
      });

      setPhrases(res.phrases);
      setCurrentCredits(res.creditsRemaining);

      toast(`Phrases generated! Used 1 token. ${res.creditsRemaining} remaining.`, "success");
    } catch (err: unknown) {
      console.error("Failed to generate phrases:", err);
      toast("Could not generate phrases with AI. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePackCreated = (newPack: EnrichedDictionaryList) => {
    setSavedPacks((prev) => [newPack, ...prev]);
  };

  const handlePackDeleted = (packId: string) => {
    setSavedPacks((prev) => prev.filter((p) => p.id !== packId));
    if (activePack?.id === packId) {
      setActivePack(null);
    }
  };

  // If user has zero dictionaries at all
  if (initialUserDictionaries.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="p-10 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)]/50 backdrop-blur-xl shadow-xl">
          <BookOpen className="h-16 w-16 mx-auto text-primary-500/50 mb-4" />
          <h2 className="text-2xl font-bold font-heading mb-2">
            {t("need_dictionaries_title")}
          </h2>
          <p className="text-[var(--fg)]/60 max-w-md mx-auto mb-6 text-sm">
            {t("need_dictionaries_desc")}
          </p>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus className="h-5 w-5" />
            {t("create_dictionary_btn")}
          </Link>
        </div>
      </main>
    );
  }

  // If no active pack, render the pack selector directly as page content
  if (!activePack) {
    return (
      <main
        ref={rootRef}
        className="min-h-[calc(100vh-4rem)] w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto"
      >
        <DictionaryListSelectorModal
          isOpen={true}
          isInline={true}
          savedPacks={savedPacks}
          userDictionaries={initialUserDictionaries}
          onSelectPack={(pack) => {
            setActivePack(pack);
            setSelectedWords([]);
            setPhrases([]);
          }}
          onPackCreated={handlePackCreated}
          onPackDeleted={handlePackDeleted}
        />
      </main>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Loading state while loading pack dictionary words */}
      {isLoadingDicts && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--bg)]/70 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-3" />
          <p className="text-sm font-semibold text-[var(--fg)]/70">
            Loading playground tables...
          </p>
        </div>
      )}

      {/* Active Playground Canvas */}
      <PlaygroundCanvas
        key={activePack.id || "default"}
        packId={activePack.id}
        packTitle={activePack.title}
        language={activePack.language}
        dictionaries={canvasDictionaries}
        savedPositions={activePack.positions}
        savedPhrases={activePack.savedPhrases || []}
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
        isSelectedWord={isSelectedWord}
        onToggleWord={handleToggleWord}
        onWordAdded={handleWordAdded}
        onOpenPackSelector={() => setActivePack(null)}
        onPositionsUpdated={handlePositionsUpdated}
        userDictionaries={initialUserDictionaries}
        onAddDictionaries={handleAddDictionaries}
        onRemoveDictionary={handleRemoveDictionary}
      />

      {/* Bottom Dock with Selected Words & AI Phrase Generation */}
      <PlaygroundBottomDock
        selectedWords={selectedWords}
        onRemoveWord={handleRemoveWord}
        onClearAll={handleClearAll}
        onGenerate={handleGeneratePhrases}
        isGenerating={isGenerating}
        phrases={phrases}
        dictionaries={canvasDictionaries}
        aiCredits={currentCredits}
        onWordAdded={handleWordAdded}
        savedPhrases={activePack.savedPhrases || []}
        onToggleSavePhrase={handleToggleSavePhrase}
        language={activePack.language}
      />

      {/* Saved Phrases Collapsible Side Panel (appears above Chosen Words section) */}
      <SavedPhrasesSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        savedPhrases={activePack.savedPhrases || []}
        onDeletePhrase={handleDeleteSavedPhrase}
        onClearAllPhrases={handleClearAllSavedPhrases}
        language={activePack.language}
        packTitle={activePack.title}
      />
    </div>
  );
}
