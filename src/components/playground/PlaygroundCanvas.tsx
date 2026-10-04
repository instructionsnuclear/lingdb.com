"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import {
  Layers,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Check,
  Loader2,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import DraggableDictionaryTable from "./DraggableDictionaryTable";
import AddDictionaryModal, {
  type UserDictionarySummary,
} from "./AddDictionaryModal";
import {
  type PlaygroundDictionary,
  type SavedPlaygroundPhrase,
  updateDictionaryListPositions,
} from "@/lib/api/playground.api";
import type { Word } from "@/lib/db/schema";

interface PlaygroundCanvasProps {
  packId?: string;
  packTitle: string;
  language: string;
  dictionaries: PlaygroundDictionary[];
  savedPositions?: Record<string, { x: number; y: number }> | null;
  savedPhrases?: SavedPlaygroundPhrase[];
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  isSelectedWord: (wordId: string) => boolean;
  onToggleWord: (word: Word, dictionary: PlaygroundDictionary) => void;
  onWordAdded: (dictionaryId: string, newWord: Word) => void;
  onOpenPackSelector: () => void;
  onPositionsUpdated?: (positions: Record<string, { x: number; y: number }>) => void;
  userDictionaries?: UserDictionarySummary[];
  onAddDictionaries?: (selectedIds: string[]) => Promise<void> | void;
  onRemoveDictionary?: (dictionaryId: string) => void;
}

export default function PlaygroundCanvas({
  packId,
  packTitle,
  language,
  dictionaries,
  savedPositions,
  savedPhrases,
  isSidePanelOpen,
  onToggleSidePanel,
  isSelectedWord,
  onToggleWord,
  onWordAdded,
  onOpenPackSelector,
  onPositionsUpdated,
  userDictionaries,
  onAddDictionaries,
  onRemoveDictionary,
}: PlaygroundCanvasProps) {
  const t = useTranslations("playground");
  const [isAddDictModalOpen, setIsAddDictModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Compute fallback layout positions (nice staggered grid)
  const initialPositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const cardWidth = 380;
    const cardHeight = 360;
    const gap = 32;
    const startX = 64;
    const startY = 48;

    dictionaries.forEach((dict, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      pos[dict.id] = {
        x: startX + col * (cardWidth + gap),
        y: startY + row * (cardHeight + gap),
      };
    });
    return pos;
  }, [dictionaries]);

  // Helper to merge stored/saved positions with defaults
  const getMergedPositions = useCallback(
    (
      dicts: PlaygroundDictionary[],
      defaults: Record<string, { x: number; y: number }>,
    ) => {
      let local: Record<string, { x: number; y: number }> | null = null;
      if (packId && typeof window !== "undefined") {
        try {
          const item = localStorage.getItem(
            `lingdb_playground_positions_${packId}`,
          );
          if (item) local = JSON.parse(item);
        } catch {
          // ignore
        }
      }

      const merged: Record<string, { x: number; y: number }> = {};
      dicts.forEach((dict) => {
        const candidate =
          (local && local[dict.id]) ||
          (savedPositions && savedPositions[dict.id]) ||
          defaults[dict.id] ||
          { x: 64, y: 48 };

        merged[dict.id] = {
          x: typeof candidate.x === "number" ? candidate.x : 64,
          y: typeof candidate.y === "number" ? candidate.y : 48,
        };
      });
      return merged;
    },
    [packId, savedPositions],
  );

  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >(() => getMergedPositions(dictionaries, initialPositions));

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPositionsRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [zIndices, setZIndices] = useState<Record<string, number>>({});
  const [topZIndex, setTopZIndex] = useState(10);

  // ─── Camera Pan & Zoom State ───────────────────────────────────────────────
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("lingdb_playground_zoom");
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val >= 0.25 && val <= 2.5) return val;
        }
      } catch {}
    }
    return 1;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    if (packId && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`lingdb_playground_pan_${packId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            return parsed;
          }
        }
      } catch {}
    }
    return { x: 0, y: 0 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const savePanToStorage = useCallback(
    (newPan: { x: number; y: number }) => {
      if (packId && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `lingdb_playground_pan_${packId}`,
            JSON.stringify(newPan),
          );
        } catch {}
      }
    },
    [packId],
  );

  // Sync positions when dictionaries or savedPositions update
  useEffect(() => {
    if (dictionaries.length === 0) return;
    setPositions((prev) => {
      const merged = getMergedPositions(dictionaries, initialPositions);
      const updated: Record<string, { x: number; y: number }> = {};
      dictionaries.forEach((dict) => {
        updated[dict.id] = prev[dict.id] || merged[dict.id] || { x: 64, y: 48 };
      });
      return updated;
    });
  }, [dictionaries, initialPositions, getMergedPositions]);

  // Pointer sensor with 5px threshold so clicking rows/buttons won't trigger drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const bringToFront = useCallback(
    (id: string) => {
      setTopZIndex((prev) => {
        const nextZ = prev + 1;
        setZIndices((z) => ({ ...z, [id]: nextZ }));
        return nextZ;
      });
    },
    [],
  );

  // Debounced auto-save function
  const triggerAutoSave = useCallback(
    (newPositions: Record<string, { x: number; y: number }>) => {
      pendingPositionsRef.current = newPositions;
      if (onPositionsUpdated) {
        onPositionsUpdated(newPositions);
      }

      // 1. Instant local storage cache
      if (packId && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `lingdb_playground_positions_${packId}`,
            JSON.stringify(newPositions),
          );
        } catch (err) {
          console.warn("Could not save positions to localStorage:", err);
        }
      }

      if (!packId) return;

      // 2. Debounced database auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }

      setSaveStatus("saving");

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await updateDictionaryListPositions(packId, newPositions);
          setSaveStatus("saved");
          pendingPositionsRef.current = null;
          savedTimerRef.current = setTimeout(() => {
            setSaveStatus("idle");
          }, 3000);
        } catch (err) {
          console.error("Failed to auto-save table positions:", err);
          setSaveStatus("idle");
        }
      }, 700);
    },
    [packId, onPositionsUpdated],
  );

  // Flush pending position updates on tab close/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingPositionsRef.current && packId) {
        try {
          fetch(`/api/dictionary-lists/${packId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positions: pendingPositionsRef.current }),
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [packId]);

  // ─── Mouse Wheel Zoom (Centered at Cursor) ─────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      // Disable default page scroll and history navigation
      e.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.ctrlKey
        ? Math.exp(-e.deltaY * 0.01)
        : Math.exp(-e.deltaY * 0.0018);

      setZoom((prevZoom) => {
        const nextZoom = Math.min(
          2.5,
          Math.max(0.25, Math.round(prevZoom * factor * 100) / 100),
        );
        if (nextZoom === prevZoom) return prevZoom;

        // Focal zoom: keeps the point directly under cursor stationary
        setPan((prevPan) => {
          const canvasX = (mouseX - prevPan.x) / prevZoom;
          const canvasY = (mouseY - prevPan.y) / prevZoom;
          const newPan = {
            x: Math.round(mouseX - canvasX * nextZoom),
            y: Math.round(mouseY - canvasY * nextZoom),
          };
          savePanToStorage(newPan);
          return newPan;
        });

        try {
          localStorage.setItem("lingdb_playground_zoom", String(nextZoom));
        } catch {}

        return nextZoom;
      });
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [savePanToStorage]);

  // ─── Canvas Camera Panning (Drag Background) ──────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      "button, input, textarea, select, a, [data-draggable-table], [data-no-pan]",
    );

    if (isInteractive && e.button !== 1 && !isSpacePressed) {
      return;
    }

    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning || !panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      setPan({
        x: panStartRef.current.startPanX + dx,
        y: panStartRef.current.startPanY + dy,
      });
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        if (panStartRef.current) {
          setPan((currentPan) => {
            savePanToStorage(currentPan);
            return currentPan;
          });
          panStartRef.current = null;
        }
      }
    };

    if (isPanning) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, savePanToStorage]);

  // ─── Space Bar Panning Shortcut ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isSpacePressed &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  // ─── Zoom Controls Helpers ────────────────────────────────────────────────
  const handleZoomIn = () => {
    setZoom((prev) => {
      const next = Math.min(2.5, Math.round((prev + 0.15) * 10) / 10);
      try {
        localStorage.setItem("lingdb_playground_zoom", String(next));
      } catch {}
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(0.25, Math.round((prev - 0.15) * 10) / 10);
      try {
        localStorage.setItem("lingdb_playground_zoom", String(next));
      } catch {}
      return next;
    });
  };

  const handleResetCamera = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    try {
      localStorage.setItem("lingdb_playground_zoom", "1");
      if (packId) localStorage.removeItem(`lingdb_playground_pan_${packId}`);
    } catch {}
  };

  const handleDragStart = (event: DragStartEvent) => {
    bringToFront(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = String(active.id);

    setPositions((prev) => {
      const current = prev[id] || initialPositions[id] || { x: 64, y: 48 };
      // Local canvas coordinates (scale-compensated)
      const newX = Math.round(current.x + delta.x / zoom);
      const newY = Math.round(current.y + delta.y / zoom);
      const nextPositions = {
        ...prev,
        [id]: { x: newX, y: newY },
      };
      triggerAutoSave(nextPositions);
      return nextPositions;
    });
  };

  const handleResetPositions = () => {
    setPositions(initialPositions);
    triggerAutoSave(initialPositions);
    handleResetCamera();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col select-none"
    >
      {/* Full-width Sub-Navbar directly below main navbar */}
      <div className="shrink-0 w-full border-b border-[var(--border-color)] bg-[var(--surface)]/80 backdrop-blur-xl shadow-xs z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-3 w-full">
          {/* Left side: Return icon button + Pack metadata */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onOpenPackSelector}
              className="flex items-center justify-center p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-primary-500/10 hover:border-primary-500/40 hover:text-primary-600 dark:hover:text-primary-400 text-[var(--fg)]/80 transition-all active:scale-95 shadow-xs shrink-0"
              title={t("switch_pack")}
              aria-label={t("switch_pack")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 hidden xs:flex shrink-0">
              <Layers className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-[var(--fg)] font-heading truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                  {packTitle}
                </h1>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-300 shrink-0">
                  {language}
                </span>
              </div>
              <p className="text-[11px] text-[var(--fg)]/50 truncate hidden sm:block">
                {dictionaries.length} {dictionaries.length === 1 ? "dictionary" : "dictionaries"} · Drag canvas or hold Space to pan · Wheel to zoom
              </p>
            </div>
          </div>

          {/* Right side: Layout Auto-Save Indicator + Reset Layout */}
          <div className="flex items-center gap-2 shrink-0">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-[var(--fg)]/70 bg-[var(--surface)] border border-[var(--border-color)] animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin text-primary-500" />
                <span className="hidden sm:inline">Saving positions...</span>
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">Auto-saved</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetPositions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-primary-500/10 hover:border-primary-500/30 text-xs font-semibold text-[var(--fg)]/70 hover:text-[var(--fg)] transition-colors active:scale-95"
              title={t("reset_layout")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("reset_layout")}</span>
            </button>

            {/* Add Dictionary Button (right next to Yerleşimi Sıfırla) */}
            {onAddDictionaries && userDictionaries && (
              <button
                type="button"
                onClick={() => setIsAddDictModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-primary-500/10 hover:border-primary-500/30 text-xs font-semibold text-[var(--fg)]/70 hover:text-[var(--fg)] transition-colors active:scale-95"
                title={t("add_dictionary")}
              >
                <Plus className="h-3.5 w-3.5 text-primary-500" />
                <span className="hidden sm:inline">{t("add_dictionary")}</span>
              </button>
            )}

            {/* Saved Phrases Toggle Button */}
            <button
              type="button"
              onClick={onToggleSidePanel}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs active:scale-95",
                isSidePanelOpen
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                  : "border-[var(--border-color)] bg-[var(--surface)] hover:bg-primary-500/5 text-[var(--fg)]/75 hover:text-[var(--fg)]",
              )}
              title="View Saved Phrases"
            >
              <Bookmark
                className={cn(
                  "h-3.5 w-3.5",
                  savedPhrases && savedPhrases.length > 0
                    ? "fill-amber-500 text-amber-500"
                    : "text-[var(--fg)]/50",
                )}
              />
              <span className="hidden sm:inline">Saved Phrases</span>
              {savedPhrases && savedPhrases.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {savedPhrases.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Infinite Canvas Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "relative w-full flex-1 overflow-hidden select-none outline-none",
          isPanning
            ? "cursor-grabbing"
            : isSpacePressed
              ? "cursor-grab"
              : "cursor-default",
        )}
        style={{
          backgroundColor: "var(--bg)",
          backgroundImage:
            "radial-gradient(rgba(148, 163, 184, 0.35) 1.2px, transparent 1.2px)",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
        }}
      >
        {/* DndContext for 2D draggable tables */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Transformed infinite canvas layer */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "0 0",
              willChange: isPanning ? "transform" : "auto",
            }}
          >
            <div className="pointer-events-auto">
              {dictionaries.map((dict) => {
                const pos =
                  positions[dict.id] ||
                  initialPositions[dict.id] || { x: 64, y: 48 };
                const zIndex = zIndices[dict.id] || 1;

                return (
                  <DraggableDictionaryTable
                    key={dict.id}
                    dictionary={dict}
                    position={pos}
                    zIndex={zIndex}
                    zoom={zoom}
                    isSelectedWord={isSelectedWord}
                    onToggleWord={onToggleWord}
                    onWordAdded={onWordAdded}
                    onBringToFront={() => bringToFront(dict.id)}
                    onRemoveDictionary={onRemoveDictionary}
                  />
                );
              })}
            </div>
          </div>
        </DndContext>
      </div>

      {/* Floating Canvas Zoom & Camera Controls in Bottom Right */}
      <div
        className="fixed bottom-24 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-1 p-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]/95 backdrop-blur-xl shadow-xl transition-all"
        aria-label="Canvas zoom and camera controls"
      >
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.25}
          className="p-1.5 rounded-xl hover:bg-[var(--bg)] text-[var(--fg)]/70 hover:text-[var(--fg)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          title="Zoom Out (Mouse wheel down)"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          className="px-2 py-1 text-xs font-bold font-mono text-[var(--fg)]/80 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors min-w-[42px] text-center"
          title="Reset zoom & camera (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 2.5}
          className="p-1.5 rounded-xl hover:bg-[var(--bg)] text-[var(--fg)]/70 hover:text-[var(--fg)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          title="Zoom In (Mouse wheel up)"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Add Dictionary to Playground Modal */}
      {onAddDictionaries && userDictionaries && (
        <AddDictionaryModal
          isOpen={isAddDictModalOpen}
          onClose={() => setIsAddDictModalOpen(false)}
          availableDictionaries={userDictionaries}
          existingDictionaryIds={dictionaries.map((d) => d.id)}
          currentLanguage={language}
          onAddDictionaries={onAddDictionaries}
        />
      )}
    </div>
  );
}
