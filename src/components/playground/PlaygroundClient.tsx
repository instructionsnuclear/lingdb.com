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
  aiCredits: number;
}

export default function PlaygroundClient({
  locale,
  initialUserDictionaries,
  initialSavedPacks,
  initialPackId,
  aiCredits: initialAiCredits,
}: PlaygroundClientProps) {
  const t = useTranslations("playground");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);

  const [savedPacks, setSavedPacks] =
    useState<EnrichedDictionaryList[]>(initialSavedPacks);
  const [currentCredits, setCurrentCredits] = useState<number>(initialAiCredits);

  // Active pack selection (restores URL packId, last used pack from localStorage, or first saved pack)
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
    if (typeof window !== "undefined") {
      try {
        const lastId = localStorage.getItem("lingdb_last_active_pack_id");
        if (lastId) {
          const found = initialSavedPacks.find((p) => p.id === lastId);
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
      } catch {
        // ignore
      }
    }
    if (initialSavedPacks.length > 0) {
      const first = initialSavedPacks[0];
      return {
        id: first.id,
        title: first.title,
        language: first.language,
        dictionaryIds: first.dictionaryIds,
        positions: first.positions,
        savedPhrases: first.savedPhrases,
      };
    }
    return null;
  });

  // Track last active pack in localStorage
  useEffect(() => {
    if (activePack?.id && typeof window !== "undefined") {
      try {
        localStorage.setItem("lingdb_last_active_pack_id", activePack.id);
      } catch {
        // ignore
      }
    }
  }, [activePack?.id]);

  // Disable page/body scroll on playground to allow infinite canvas camera
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(!activePack);
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
      setIsModalOpen(true);
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

  return (
    <div ref={rootRef} className="relative w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Pack Selection Modal */}
      <DictionaryListSelectorModal
        isOpen={isModalOpen}
        onClose={() => {
          if (activePack) setIsModalOpen(false);
        }}
        savedPacks={savedPacks}
        userDictionaries={initialUserDictionaries}
        onSelectPack={(pack) => {
          setActivePack(pack);
          setSelectedWords([]);
          setPhrases([]);
          setIsModalOpen(false);
        }}
        onPackCreated={handlePackCreated}
        onPackDeleted={handlePackDeleted}
      />

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
      {activePack && (
        <>
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
            onOpenPackSelector={() => setIsModalOpen(true)}
            onPositionsUpdated={handlePositionsUpdated}
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
        </>
      )}

      {/* If no active pack and modal is closed */}
      {!activePack && !isModalOpen && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <Layers className="h-16 w-16 text-[var(--fg)]/30 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Dictionary List Selected</h2>
          <p className="text-sm text-[var(--fg)]/50 max-w-sm mb-5">
            Select or create a pack of dictionaries to enter the playground.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-all shadow-md shadow-primary-500/20"
          >
            {t("select_or_create_pack")}
          </button>
        </div>
      )}
    </div>
  );
}
