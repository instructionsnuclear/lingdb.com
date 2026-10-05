"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type FormEvent,
} from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowLeft,
  Workflow,
  Plus,
  Send,
  X,
  Settings,
  Sparkles,
  Volume2,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import gsap from "gsap";
import type { DialogueTree, DialogueTreeNode, Word } from "@/lib/db/schema";
import DialogueTreeNodeCard from "./DialogueTreeNodeCard";
import DialogueTreeConnections from "./DialogueTreeConnections";
import DialogueTreeSettingsModal from "./DialogueTreeSettingsModal";
import type { SavedWordInfo, UserDictionaryMeta } from "./DialoguePhraseWords";
import {
  layoutDialogueTree,
  getConversationLine,
  getNodeDepth,
} from "@/lib/utils/tree-layout";
import {
  updateDialogueTree,
  suggestDialogueResponses,
  type DialogueTreeSuggestionItem,
} from "@/lib/api/dialogue-trees.api";
import { useToast } from "@/components/ui/Toast";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils/cn";
import { useTranslations, useLocale } from "next-intl";

interface DialogueTreeCanvasProps {
  tree: DialogueTree;
  savedWordsMap: Map<string, SavedWordInfo>;
  userDictionaries: UserDictionaryMeta[];
  aiCredits: number;
  onBackToSelector: () => void;
  onWordSaved: (word: Word, dictTitle: string) => void;
  onWordDeleted?: (
    wordId: string,
    cleanedWord: string,
    dictionaryId: string,
  ) => void;
  onTreeUpdated: (updatedTree: DialogueTree) => void;
  onCreditsUpdated: (credits: number) => void;
}

export default function DialogueTreeCanvas({
  tree,
  savedWordsMap,
  userDictionaries,
  aiCredits,
  onBackToSelector,
  onWordSaved,
  onWordDeleted,
  onTreeUpdated,
  onCreditsUpdated,
}: DialogueTreeCanvasProps) {
  const t = useTranslations("dialogueTrees");
  const locale = useLocale();
  const { toast } = useToast();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Tree nodes state
  const [nodes, setNodes] = useState<DialogueTreeNode[]>(() => {
    if (tree.nodes && tree.nodes.length > 0) {
      return tree.nodes;
    }
    // Fallback if tree has empty nodes
    return [
      {
        id: uuidv4(),
        parentId: null,
        text: "Hello, how are you?",
        childrenIds: [],
        x: 100,
        y: 280,
      },
    ];
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    () => nodes[0]?.id || null,
  );

  // Camera Pan & Zoom (Initialized from tree or defaults)
  const [zoom, setZoom] = useState<number>(() => {
    return typeof tree.zoom === "number" && tree.zoom >= 0.25 && tree.zoom <= 2.5
      ? tree.zoom
      : 1;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    return tree.pan && typeof tree.pan.x === "number"
      ? tree.pan
      : { x: 0, y: 0 };
  });

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  // Search Phrases State & Smooth Camera Navigation
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cameraTweenRef = useRef<gsap.core.Tween | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Auto-save debounce state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{
    nodes?: DialogueTreeNode[];
    pan?: { x: number; y: number };
    zoom?: number;
  } | null>(null);

  // AI Suggestions state: maps nodeId -> suggestions array
  const [suggestionsMap, setSuggestionsMap] = useState<
    Record<string, DialogueTreeSuggestionItem[]>
  >({});
  const [generatingForNodeId, setGeneratingForNodeId] = useState<string | null>(
    null,
  );
  // Set of node IDs whose suggestions box is currently open (supports multiple open boxes)
  const [openSuggestionsNodeIds, setOpenSuggestionsNodeIds] = useState<
    Set<string>
  >(() => new Set());

  // Adding response modal/popup state
  const [addingResponseParentId, setAddingResponseParentId] = useState<
    string | null
  >(null);
  const [newPhraseInput, setNewPhraseInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Dialogue Tree Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Text-to-speech voice playback for phrases
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const handleSpeak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        toast(t("speechNotSupported"), "info");
        return;
      }

      // If already speaking this phrase, cancel it
      if (window.speechSynthesis.speaking && speakingText === text) {
        window.speechSynthesis.cancel();
        setSpeakingText(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<string, string> = {
        de: "de-DE",
        es: "es-ES",
        fr: "fr-FR",
        en: "en-US",
        tr: "tr-TR",
      };
      utterance.lang =
        (tree.language && langMap[tree.language]) || tree.language || "en-US";
      utterance.rate = 0.9;

      utterance.onstart = () => {
        setSpeakingText(text);
      };
      utterance.onend = () => {
        setSpeakingText(null);
      };
      utterance.onerror = () => {
        setSpeakingText(null);
      };

      setSpeakingText(text);
      window.speechSynthesis.speak(utterance);
    },
    [tree.language, speakingText, t, toast],
  );

  // Ensure viewport is scrolled to top on mount so top controls bar is never hidden
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Stop any ongoing speech when unmounting
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ─── Drag & Drop (like Playground canvas) ──────────────────────────────────
  const [zIndices, setZIndices] = useState<Record<string, number>>({});
  const [, setTopZIndex] = useState(10);

  const bringToFront = useCallback((id: string) => {
    setTopZIndex((prev) => {
      const nextZ = prev + 1;
      setZIndices((z) => ({ ...z, [id]: nextZ }));
      return nextZ;
    });
  }, []);

  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    delta: { x: number; y: number };
  } | null>(null);

  // Pointer sensor with 5px distance constraint so clicks on words/buttons work seamlessly
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      bringToFront(id);
      setSelectedNodeId(id);
      setActiveDrag({ id, delta: { x: 0, y: 0 } });
    },
    [bringToFront],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const id = String(event.active.id);
      setActiveDrag({
        id,
        delta: {
          x: event.delta.x / zoom,
          y: event.delta.y / zoom,
        },
      });
    },
    [zoom],
  );

  // Live nodes with realtime position updates while dragging (for smart procedural arrow recalculation)
  const liveNodes = useMemo(() => {
    if (!activeDrag) return nodes;
    return nodes.map((n) => {
      if (n.id === activeDrag.id) {
        return {
          ...n,
          x: Math.round(n.x + activeDrag.delta.x),
          y: Math.round(n.y + activeDrag.delta.y),
        };
      }
      return n;
    });
  }, [nodes, activeDrag]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback(
    (
      newNodes: DialogueTreeNode[],
      newPan = panRef.current,
      newZoom = zoomRef.current,
    ) => {
      pendingUpdateRef.current = {
        nodes: newNodes,
        pan: newPan,
        zoom: newZoom,
      };

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      setSaveStatus("saving");

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await updateDialogueTree(tree.id, {
            nodes: newNodes,
            pan: newPan,
            zoom: newZoom,
          });
          onTreeUpdated(res.tree);
          setSaveStatus("saved");
          pendingUpdateRef.current = null;
          savedTimerRef.current = setTimeout(() => {
            setSaveStatus("idle");
          }, 2500);
        } catch (err) {
          console.error("Failed to auto-save dialogue tree:", err);
          setSaveStatus("idle");
        }
      }, 700);
    },
    [tree.id, onTreeUpdated],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const id = String(active.id);
      const deltaX = Math.round(delta.x / zoom);
      const deltaY = Math.round(delta.y / zoom);

      setActiveDrag(null);

      if (deltaX === 0 && deltaY === 0) return;

      setNodes((prevNodes) => {
        const updated = prevNodes.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              x: Math.round(n.x + deltaX),
              y: Math.round(n.y + deltaY),
            };
          }
          return n;
        });
        triggerAutoSave(updated);
        return updated;
      });
    },
    [zoom, triggerAutoSave],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  // Fetch AI suggestions for a specific node
  const fetchSuggestionsForNode = useCallback(
    async (nodeId: string, currentNodes = nodes, isRefresh = false) => {
      const node = currentNodes.find((n) => n.id === nodeId);
      if (!node) return;

      const conversationLine = getConversationLine(currentNodes, nodeId);
      setGeneratingForNodeId(nodeId);
      // Ensure suggestions box is opened for this node (does not close other open boxes)
      setOpenSuggestionsNodeIds((prev) => new Set([...prev, nodeId]));

      try {
        const res = await suggestDialogueResponses({
          conversationLine,
          language: tree.language,
          currentPhrase: node.text,
          isRefresh,
          metaContext: tree.metaContext,
          level: tree.level,
          translationLanguage: locale,
        });

        setSuggestionsMap((prev) => ({
          ...prev,
          [nodeId]: res.suggestions,
        }));
        if (typeof res.creditsRemaining === "number") {
          onCreditsUpdated(res.creditsRemaining);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch suggestions:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Could not get AI suggestions.";
        toast(errorMessage, "error");
      } finally {
        setGeneratingForNodeId(null);
      }
    },
    [nodes, tree.language, tree.metaContext, tree.level, locale, onCreditsUpdated, toast],
  );

  // Toggle suggestions box: keeps previously generated suggestions if they exist!
  const handleToggleSuggestions = useCallback(
    (nodeId: string) => {
      setOpenSuggestionsNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
          // If suggestions do not exist yet, generate them. Otherwise keep previously generated suggestions!
          if (!suggestionsMap[nodeId] || suggestionsMap[nodeId].length === 0) {
            fetchSuggestionsForNode(nodeId, nodes, false);
          }
        }
        return next;
      });
    },
    [suggestionsMap, fetchSuggestionsForNode, nodes],
  );

  // Close only this node's suggestions box
  const handleCloseSuggestions = useCallback((nodeId: string) => {
    setOpenSuggestionsNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  // Explicitly regenerate suggestions when refresh button is clicked (consumes 1 credit)
  const handleRegenerateSuggestions = useCallback(
    (nodeId: string) => {
      setOpenSuggestionsNodeIds((prev) => new Set([...prev, nodeId]));
      fetchSuggestionsForNode(nodeId, nodes, true);
    },
    [fetchSuggestionsForNode, nodes],
  );

  // Handle adding a new phrase (custom typed or accepted from AI)
  const handleAddPhrase = useCallback(
    (parentId: string, phraseText: string, translationText?: string) => {
      const trimmed = phraseText.trim();
      if (!trimmed) return;

      const parentNode = nodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const newNodeId = uuidv4();
      const existingSiblings = nodes.filter((n) => n.parentId === parentId);

      // Position the new node to the right of parent, staggering below existing siblings without resetting any card positions
      let newY = parentNode.y;
      if (existingSiblings.length > 0) {
        const lowestSiblingY = Math.max(...existingSiblings.map((s) => s.y));
        newY = lowestSiblingY + 160;
      }

      const newNode: DialogueTreeNode = {
        id: newNodeId,
        parentId,
        text: trimmed,
        translation: translationText?.trim() || undefined,
        childrenIds: [],
        x: parentNode.x + 450,
        y: newY,
      };

      const updatedNodes = nodes.map((n) => {
        if (n.id === parentId) {
          return {
            ...n,
            childrenIds: Array.from(new Set([...(n.childrenIds || []), newNodeId])),
          };
        }
        return n;
      });
      updatedNodes.push(newNode);

      // Keep all custom user-dragged positions intact
      setNodes(updatedNodes);
      setSelectedNodeId(newNodeId);
      setAddingResponseParentId(null);
      setNewPhraseInput("");

      triggerAutoSave(updatedNodes);

      // Open suggestions for the newly added phrase without closing other open boxes!
      setOpenSuggestionsNodeIds((prev) => new Set([...prev, newNodeId]));
      fetchSuggestionsForNode(newNodeId, updatedNodes);
    },
    [nodes, triggerAutoSave, fetchSuggestionsForNode],
  );

  // Handle deleting a node and its entire subtree
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete || nodeToDelete.parentId === null) return; // Cannot delete root

      // Collect all descendants
      const toDelete = new Set<string>([nodeId]);
      let changed = true;
      while (changed) {
        changed = false;
        nodes.forEach((n) => {
          if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
            toDelete.add(n.id);
            changed = true;
          }
        });
      }

      const filtered = nodes
        .filter((n) => !toDelete.has(n.id))
        .map((n) => {
          if (n.childrenIds) {
            return {
              ...n,
              childrenIds: n.childrenIds.filter((cid) => !toDelete.has(cid)),
            };
          }
          return n;
        });

      // Keep all remaining cards in their exact positions
      setNodes(filtered);
      if (selectedNodeId && toDelete.has(selectedNodeId)) {
        setSelectedNodeId(nodeToDelete.parentId);
      }
      triggerAutoSave(filtered);
      toast("Phrase and its branches removed", "info");
    },
    [nodes, selectedNodeId, triggerAutoSave, toast],
  );

  // Auto-layout action button
  const handleAutoLayout = useCallback(() => {
    const layedOut = layoutDialogueTree(nodes);
    setNodes(layedOut);
    triggerAutoSave(layedOut);
    toast("Canvas auto-aligned", "success");
  }, [nodes, triggerAutoSave, toast]);

  // Handle modifying a node's text
  const handleUpdateNodeText = useCallback(
    (nodeId: string, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed) return;

      const updatedNodes = nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, text: trimmed, translation: undefined };
        }
        return n;
      });

      setNodes(updatedNodes);
      setSelectedNodeId(nodeId);
      triggerAutoSave(updatedNodes);

      // Upon modification, open suggestions box & generate 3 new AI suggestions!
      setOpenSuggestionsNodeIds((prev) => new Set([...prev, nodeId]));
      fetchSuggestionsForNode(nodeId, updatedNodes);
      toast("Phrase updated & AI suggestions generated!", "success");
    },
    [nodes, triggerAutoSave, fetchSuggestionsForNode, toast],
  );

  // Handle updating a node's translation (e.g. from manual translation model call)
  const handleUpdateNodeTranslation = useCallback(
    (nodeId: string, translation: string) => {
      const updatedNodes = nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, translation };
        }
        return n;
      });

      setNodes(updatedNodes);
      triggerAutoSave(updatedNodes);
    },
    [nodes, triggerAutoSave],
  );

  // Center camera on root or active node
  const handleResetCamera = useCallback(() => {
    setPan({ x: 40, y: 40 });
    setZoom(1);
    triggerAutoSave(nodes, { x: 40, y: 40 }, 1);
  }, [nodes, triggerAutoSave]);

  // ─── Search Phrases & Smooth Camera Navigation ──────────────────────────
  const matchingNodes = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return [];
    return nodes.filter((node) => {
      const matchText = node.text.toLowerCase().includes(trimmed);
      const matchTranslation = node.translation?.toLowerCase().includes(trimmed);
      return matchText || matchTranslation;
    });
  }, [nodes, searchQuery]);

  const focusNodeSmoothly = useCallback(
    (targetNode: DialogueTreeNode) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      // Target center of node in viewport center (node card is 310px wide, ~130px tall)
      const targetPanX = Math.round(rect.width / 2 - (targetNode.x + 155) * currentZoom);
      const targetPanY = Math.round(rect.height / 2 - (targetNode.y + 65) * currentZoom);

      if (cameraTweenRef.current) {
        cameraTweenRef.current.kill();
      }

      const panProxy = { x: panRef.current.x, y: panRef.current.y };
      cameraTweenRef.current = gsap.to(panProxy, {
        x: targetPanX,
        y: targetPanY,
        duration: 0.75,
        ease: "power2.out",
        onUpdate: () => {
          setPan({
            x: Math.round(panProxy.x),
            y: Math.round(panProxy.y),
          });
        },
        onComplete: () => {
          setPan({ x: targetPanX, y: targetPanY });
          cameraTweenRef.current = null;
        },
      });

      // 1-second highlight animation
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      setHighlightedNodeId(targetNode.id);
      setSelectedNodeId(targetNode.id);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedNodeId(null);
        highlightTimeoutRef.current = null;
      }, 1000);
    },
    [],
  );

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      } else {
        setSearchQuery("");
        setHighlightedNodeId(null);
        setCurrentMatchIndex(0);
      }
      return next;
    });
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setHighlightedNodeId(null);
    setCurrentMatchIndex(0);
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setCurrentMatchIndex(0);
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) {
        setHighlightedNodeId(null);
        return;
      }
      const matched = nodes.filter((node) => {
        const matchText = node.text.toLowerCase().includes(trimmed);
        const matchTranslation = node.translation?.toLowerCase().includes(trimmed);
        return matchText || matchTranslation;
      });
      if (matched.length > 0) {
        focusNodeSmoothly(matched[0]);
      } else {
        setHighlightedNodeId(null);
      }
    },
    [nodes, focusNodeSmoothly],
  );

  const handleNavigateMatch = useCallback(
    (direction: 1 | -1) => {
      if (matchingNodes.length === 0) return;
      const nextIndex =
        (currentMatchIndex + direction + matchingNodes.length) %
        matchingNodes.length;
      setCurrentMatchIndex(nextIndex);
      focusNodeSmoothly(matchingNodes[nextIndex]);
    },
    [matchingNodes, currentMatchIndex, focusNodeSmoothly],
  );

  const handleSearchInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (matchingNodes.length > 0) {
        handleNavigateMatch(e.shiftKey ? -1 : 1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matchingNodes.length > 0) {
        handleNavigateMatch(e.shiftKey ? -1 : 1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCloseSearch();
    }
  };

  // Keyboard Shortcuts: Ctrl+F to open search, Tab / Shift+Tab to cycle matching phrases
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }

      if (isSearchOpen && matchingNodes.length > 0 && e.key === "Tab") {
        const target = e.target as HTMLElement | null;
        if (target === searchInputRef.current) {
          return;
        }
        if (
          target?.tagName === "TEXTAREA" ||
          (target?.tagName === "INPUT" && target !== searchInputRef.current)
        ) {
          return;
        }
        e.preventDefault();
        handleNavigateMatch(e.shiftKey ? -1 : 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, matchingNodes, handleNavigateMatch]);

  // Clean up GSAP tweens and highlight timer on unmount
  useEffect(() => {
    return () => {
      if (cameraTweenRef.current) {
        cameraTweenRef.current.kill();
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // ─── Mouse Wheel Focal Zoom (centered at cursor) ───────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      // If wheel event is inside an editable input/textarea or menu/popup, do not zoom canvas
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.(
          "textarea, input, select, [data-dialogue-tree-menu], [data-no-canvas-zoom]",
        )
      ) {
        return;
      }

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

        setPan((prevPan) => {
          const canvasX = (mouseX - prevPan.x) / prevZoom;
          const canvasY = (mouseY - prevPan.y) / prevZoom;
          const newPan = {
            x: Math.round(mouseX - canvasX * nextZoom),
            y: Math.round(mouseY - canvasY * nextZoom),
          };
          return newPan;
        });

        return nextZoom;
      });
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  // ─── Panning by background drag ──────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      "button, input, textarea, select, a, [data-dialogue-node], [data-no-pan]",
    );

    if (isInteractive && e.button !== 1 && !isSpacePressed) {
      return;
    }

    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
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
        panStartRef.current = null;
        triggerAutoSave(nodesRef.current, panRef.current, zoomRef.current);
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
  }, [isPanning, triggerAutoSave]);

  // ─── Touch Panning & Multi-touch Pinch Zoom for Mobile ───────────────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let touchPanStart: {
      startX: number;
      startY: number;
      startPanX: number;
      startPanY: number;
    } | null = null;

    let pinchStart: {
      initialDistance: number;
      initialMidX: number;
      initialMidY: number;
      initialZoom: number;
      initialPan: { x: number; y: number };
    } | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const target = touch.target as HTMLElement | null;
        const isInteractive = target?.closest?.(
          "button, input, textarea, select, a, [data-dialogue-node], [data-no-pan]",
        );

        if (isInteractive) {
          touchPanStart = null;
          return;
        }

        setIsPanning(true);
        touchPanStart = {
          startX: touch.clientX,
          startY: touch.clientY,
          startPanX: panRef.current.x,
          startPanY: panRef.current.y,
        };
        pinchStart = null;
      } else if (e.touches.length === 2) {
        // Multi-touch pinch-to-zoom & two-finger pan
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const rect = viewport.getBoundingClientRect();
        const dist = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );
        const midX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const midY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

        pinchStart = {
          initialDistance: dist,
          initialMidX: midX,
          initialMidY: midY,
          initialZoom: zoomRef.current,
          initialPan: { ...panRef.current },
        };
        touchPanStart = null;
        setIsPanning(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pinchStart && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const rect = viewport.getBoundingClientRect();
        const dist = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );
        const currentMidX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const currentMidY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

        if (pinchStart.initialDistance > 0) {
          const factor = dist / pinchStart.initialDistance;
          const nextZoom = Math.min(
            2.5,
            Math.max(0.25, Math.round(pinchStart.initialZoom * factor * 100) / 100),
          );

          const canvasX =
            (pinchStart.initialMidX - pinchStart.initialPan.x) /
            pinchStart.initialZoom;
          const canvasY =
            (pinchStart.initialMidY - pinchStart.initialPan.y) /
            pinchStart.initialZoom;

          const nextPan = {
            x: Math.round(currentMidX - canvasX * nextZoom),
            y: Math.round(currentMidY - canvasY * nextZoom),
          };

          setZoom(nextZoom);
          setPan(nextPan);
        }
      } else if (touchPanStart && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchPanStart.startX;
        const dy = touch.clientY - touchPanStart.startY;
        setPan({
          x: Math.round(touchPanStart.startPanX + dx),
          y: Math.round(touchPanStart.startPanY + dy),
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (touchPanStart || pinchStart) {
          setIsPanning(false);
          touchPanStart = null;
          pinchStart = null;
          triggerAutoSave(nodesRef.current, panRef.current, zoomRef.current);
        }
      } else if (e.touches.length === 1) {
        // Transitioned from 2-finger pinch to 1 finger: smoothly continue panning with remaining finger
        const touch = e.touches[0];
        pinchStart = null;
        touchPanStart = {
          startX: touch.clientX,
          startY: touch.clientY,
          startPanX: panRef.current.x,
          startPanY: panRef.current.y,
        };
      }
    };

    viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: false });
    viewport.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [triggerAutoSave]);

  // Spacebar pan shortcut
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
        e.preventDefault();
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

  // Focus input when add response popup opens
  useEffect(() => {
    if (addingResponseParentId && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [addingResponseParentId]);

  const activeParentNode = useMemo(
    () => nodes.find((n) => n.id === addingResponseParentId),
    [nodes, addingResponseParentId],
  );

  return (
    <div className="relative w-full h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden select-none bg-[var(--bg)]">
      {/* ─── Floating Top Controls Bar ─── */}
      <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex items-center justify-between gap-3">
        {/* Left Side: Back button + Tree Title + Language badge + Settings & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="pointer-events-auto flex items-center gap-3 bg-[var(--surface)]/90 backdrop-blur-xl border border-[var(--border-color)] px-4 py-2.5 rounded-2xl shadow-xl">
            <button
              type="button"
              onClick={onBackToSelector}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]/70 hover:text-primary-500 transition-colors p-1 -ml-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToTrees")}</span>
            </button>

            <div className="h-4 w-px bg-[var(--border-color)]" />

            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-primary-500" />
              <span className="font-bold text-sm tracking-tight text-[var(--fg)] truncate max-w-[160px] sm:max-w-xs">
                {tree.title}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold border border-primary-500/20">
                {tree.language}
              </span>
              <span
                title={t("levelLabel")}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-500/20"
              >
                {tree.level || "B1"}
              </span>
              {tree.metaContext && (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  title={t("metaContextActive")}
                  className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="truncate max-w-[130px]">{t("metaContextActive")}</span>
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 ml-2 text-xs text-[var(--fg)]/60">
              <span>•</span>
              <span>{t("nodeCount", { count: nodes.length })}</span>
            </div>

            <div className="h-4 w-px bg-[var(--border-color)]" />

            {/* Tree Settings Gear Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title={t("treeSettings")}
              className="p-1.5 rounded-xl text-[var(--fg)]/70 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Search Phrases Button */}
            <button
              type="button"
              onClick={handleToggleSearch}
              title={t("searchPhrases")}
              className={cn(
                "p-1.5 rounded-xl transition-colors cursor-pointer",
                isSearchOpen
                  ? "text-primary-500 bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary-500/30"
                  : "text-[var(--fg)]/70 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40",
              )}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Search Phrases Floating Pill (opened when search icon is clicked) */}
          {isSearchOpen && (
            <div
              data-no-canvas-zoom
              className="pointer-events-auto flex items-center gap-2 bg-[var(--surface)]/95 backdrop-blur-2xl border border-primary-500/40 px-3 py-1.5 rounded-2xl shadow-xl animate-in fade-in slide-in-from-left-2 duration-150"
            >
              <Search className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchInputKeyDown}
                placeholder={t("searchPhrasesPlaceholder")}
                className="w-36 sm:w-52 text-xs bg-transparent text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none font-medium"
                autoFocus
              />

              {searchQuery.trim() && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {matchingNodes.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {currentMatchIndex + 1}/{matchingNodes.length}
                      </span>
                      <kbd
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--fg)]/75 bg-[var(--fg)]/10 dark:bg-[var(--fg)]/15 border border-[var(--border-color)] rounded shadow-xs select-none"
                        title={t("tabToSwitchResults")}
                      >
                        <span>TAB</span>
                        <span className="text-[8px] opacity-70">⇥</span>
                      </kbd>
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t("searchNoMatches")}
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={matchingNodes.length <= 1}
                    onClick={() => handleNavigateMatch(-1)}
                    title={t("prevMatch")}
                    className="p-1 rounded-lg text-[var(--fg)]/60 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={matchingNodes.length <= 1}
                    onClick={() => handleNavigateMatch(1)}
                    title={t("nextMatch")}
                    className="p-1 rounded-lg text-[var(--fg)]/60 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Show kbd TAB hint if search input is empty so user knows beforehand */}
              {!searchQuery.trim() && (
                <kbd
                  className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--fg)]/50 bg-[var(--fg)]/5 border border-[var(--border-color)]/60 rounded shadow-xs select-none"
                  title={t("tabToSwitchResults")}
                >
                  <span>TAB</span>
                  <span className="text-[8px] opacity-70">⇥</span>
                </kbd>
              )}

              <button
                type="button"
                onClick={handleCloseSearch}
                className="p-1 rounded-lg text-[var(--fg)]/40 hover:text-[var(--fg)] hover:bg-[var(--bg)] transition-colors cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Zoom Controls */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface)]/90 backdrop-blur-xl border border-[var(--border-color)] shadow-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))}
              title={t("zoomIn")}
              className="p-1.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-950/40 text-[var(--fg)]/70 hover:text-primary-500 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.25, Math.round((z - 0.15) * 100) / 100))}
              title={t("zoomOut")}
              className="p-1.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-950/40 text-[var(--fg)]/70 hover:text-primary-500 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              title={t("resetView")}
              className="p-1.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-950/40 text-[var(--fg)]/70 hover:text-primary-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-[var(--fg)]/60 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ─── Infinite Canvas Viewport ─── */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        style={{
          cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : "default",
        }}
        className="w-full h-full relative overflow-hidden touch-none select-none"
      >
        {/* Background Dot Grid (Identical to Playground) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-45 dark:opacity-25"
          style={{
            backgroundImage: `radial-gradient(var(--fg) 1.2px, transparent 1.2px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* Scaled & Panned Canvas Layer */}
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "0 0",
              willChange: isPanning ? "transform" : "auto",
            }}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          >
            {/* SVG Connection Lines (smart procedural path recalculation in real time) */}
            <DialogueTreeConnections
              nodes={liveNodes}
              selectedNodeId={selectedNodeId}
            />

            {/* Tree Phrase Node Cards */}
            <div className="pointer-events-auto">
              {nodes.map((node) => {
              const depth = getNodeDepth(nodes, node.id);
              return (
                <DialogueTreeNodeCard
                  key={node.id}
                  node={node}
                  treeLanguage={tree.language}
                  depth={depth}
                  isSelected={selectedNodeId === node.id}
                  isHighlighted={highlightedNodeId === node.id}
                  searchQuery={isSearchOpen ? searchQuery : undefined}
                  isLatest={false}
                  isSuggestionsOpen={openSuggestionsNodeIds.has(node.id)}
                  aiSuggestions={suggestionsMap[node.id]}
                  isGeneratingSuggestions={generatingForNodeId === node.id}
                  savedWordsMap={savedWordsMap}
                  userDictionaries={userDictionaries}
                  zoom={zoom}
                  zIndex={zIndices[node.id] || 10}
                  speakingText={speakingText}
                  onSpeak={handleSpeak}
                  onBringToFront={() => bringToFront(node.id)}
                  onWordSaved={onWordSaved}
                  onWordDeleted={onWordDeleted}
                  onSelectNode={(id) => setSelectedNodeId(id)}
                  onClickAddLink={(id) => {
                    setAddingResponseParentId(id);
                    setNewPhraseInput("");
                  }}
                  onAcceptSuggestion={(parentId, suggText, suggTranslation) => {
                    handleAddPhrase(parentId, suggText, suggTranslation);
                  }}
                  onToggleSuggestions={handleToggleSuggestions}
                  onCloseSuggestions={handleCloseSuggestions}
                  onRegenerateSuggestions={handleRegenerateSuggestions}
                  onUpdateNodeText={handleUpdateNodeText}
                  onUpdateNodeTranslation={handleUpdateNodeTranslation}
                  onDeleteNode={handleDeleteNode}
                />
              );
            })}
            </div>
          </div>
        </DndContext>
      </div>

      {/* ─── Add Phrase Modal / Dialog ─── */}
      {/* Pops up when user clicks the arrow line handle of any phrase */}
      {addingResponseParentId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setAddingResponseParentId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-color)] shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-[var(--fg)]">
                    {t("addResponseModalTitle")}
                  </h3>
                  <p className="text-xs text-[var(--fg)]/60">
                    {t("addResponseModalSubtitle")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAddingResponseParentId(null)}
                className="p-1.5 rounded-xl text-[var(--fg)]/50 hover:text-[var(--fg)] hover:bg-[var(--bg)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parent phrase context reference */}
            {activeParentNode && (
              <div className="mb-4 p-3 rounded-2xl bg-[var(--bg)]/70 border border-[var(--border-color)]/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--fg)]/50 block">
                    {t("respondingTo")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSpeak(activeParentNode.text)}
                    className={cn(
                      "p-1 rounded-lg transition-all active:scale-90 cursor-pointer",
                      speakingText === activeParentNode.text
                        ? "text-primary-500 bg-primary-500/15"
                        : "text-[var(--fg)]/40 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-500/10",
                    )}
                    title={t("pronouncePhrase")}
                    aria-label={t("pronouncePhrase")}
                  >
                    <Volume2
                      className={cn(
                        "w-3.5 h-3.5",
                        speakingText === activeParentNode.text &&
                          "animate-pulse text-primary-500",
                      )}
                    />
                  </button>
                </div>
                <p className="text-sm font-semibold text-[var(--fg)]/90 italic">
                  &quot;{activeParentNode.text}&quot;
                </p>
              </div>
            )}

            {/* Phrase Input Form */}
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (newPhraseInput.trim()) {
                  handleAddPhrase(addingResponseParentId, newPhraseInput);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[var(--fg)]/70 mb-1.5">
                  {t("yourResponseLabel")}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newPhraseInput}
                  onChange={(e) => setNewPhraseInput(e.target.value)}
                  placeholder={t("addResponsePlaceholder")}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all font-medium text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingResponseParentId(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--fg)]/70 hover:bg-[var(--bg)] transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!newPhraseInput.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t("addPhraseAndAi")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialogue Tree Settings Modal */}
      <DialogueTreeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tree={tree}
        onTreeUpdated={onTreeUpdated}
      />
    </div>
  );
}
