"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AddWordForm from "@/components/dictionary/AddWordForm";
import MagicWords from "@/components/dictionary/MagicWords";
import WordList from "@/components/dictionary/WordList";
import DictionarySettings from "@/components/dictionary/DictionarySettings";
import DictionaryTour from "@/components/dictionary/DictionaryTour";
import ExamplePhrasePopup from "@/components/dictionary/ExamplePhrasePopup";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";
import {
  deleteDictionary,
  getDictionary,
  updateDictionary,
} from "@/lib/api/dictionaries.api";
import { qk } from "@/lib/tanstack/query-keys";
import {
  Globe,
  Lock,
  Pencil,
  Trash2,
  BookOpen,
  Layers,
  Brain,
  X,
  Settings,
} from "lucide-react";
import type {
  Dictionary,
  Word,
  ExamplePhrase,
  DictionaryEditor,
} from "@/lib/db/schema";

interface DictionaryDetailClientProps {
  dictionary: Dictionary & {
    words: (Word & { examplePhrases: ExamplePhrase[] })[];
    user?: { username: string };
    dictionaryEditors?: (DictionaryEditor & { user: { username: string } })[];
  };
  isOwner: boolean;
  currentUserId?: string;
  showTour?: boolean;
}

type DictionaryDetailData = DictionaryDetailClientProps["dictionary"];

export default function DictionaryDetailClient({
  dictionary: initialDict,
  isOwner,
  currentUserId,
  showTour = false,
}: DictionaryDetailClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("dictionary");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const { data: dictionary = initialDict } = useQuery<DictionaryDetailData>({
    queryKey: qk.dictionaries.detail(initialDict.id),
    queryFn: async () => {
      const data = await getDictionary(initialDict.id);
      return data.dictionary as DictionaryDetailData;
    },
    initialData: initialDict,
    staleTime: 120_000,
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(initialDict.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "words" | "flashcards" | "quiz" | "settings"
  >("words");
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  const refreshDictionary = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: qk.dictionaries.detail(initialDict.id),
    });
  }, [queryClient, initialDict.id]);

  const updateDictionaryMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateDictionary(initialDict.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: qk.dictionaries.detail(initialDict.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["dictionaries"] });
    },
  });

  const deleteDictionaryMutation = useMutation({
    mutationFn: () => deleteDictionary(initialDict.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dictionaries"] });
    },
  });

  const handleUpdateTitle = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateDictionaryMutation.mutateAsync({ title: editTitle.trim() });
      refreshDictionary();
    } catch {
      toast(t("settings.error_saved"), "error");
    }
  };

  const isCollaborator =
    isOwner ||
    dictionary.dictionaryEditors?.some((e) => e.userId === currentUserId);
  const canEdit =
    isOwner ||
    dictionary.dictionaryEditors?.some((e) => e.userId === currentUserId);

  const handleDelete = async () => {
    try {
      await deleteDictionaryMutation.mutateAsync();
      toast(t("settings.success_deleted"), "success");
      router.push(`/${locale}/dashboard`);
    } catch {
      toast(t("settings.error_saved"), "error");
    }
  };

  const tabs = [
    { id: "words" as const, label: t("words_tab"), icon: BookOpen },
    { id: "flashcards" as const, label: t("flashcards_tab"), icon: Layers },
    { id: "quiz" as const, label: t("quiz_tab"), icon: Brain },
  ];

  const languageFlags: Record<string, string> = {
    en: "fi fi-gb",
    fr: "fi fi-fr",
    de: "fi fi-de",
    es: "fi fi-es",
    tr: "fi fi-tr",
  };

  const existingWords = useMemo(() => {
    return dictionary.words.map((w) => ({
      title: w.title,
      translation: w.translation,
    }));
  }, [dictionary.words]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`text-4xl rounded-sm overflow-hidden ${languageFlags[dictionary.language] || "fi fi-xx"}`}
            ></span>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg)] px-3 py-1 text-2xl font-bold focus:border-primary-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleUpdateTitle}
                  className="rounded-lg p-1 text-green-500"
                ></button>
                <button
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditTitle(dictionary.title);
                  }}
                  className="rounded-lg p-1 text-[var(--fg)]/40"
                ></button>
              </div>
            ) : (
              <h1 className="text-3xl font-bold sm:text-4xl">
                {dictionary.title}
              </h1>
            )}
          </div>
          {dictionary.description && (
            <p className="mt-1 text-lg text-[var(--fg)]/50">
              {dictionary.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3">
            {dictionary.isPublic ? (
              <Badge variant="default">
                <Globe className="mr-1 h-3 w-3" />
                {t("public")}
              </Badge>
            ) : (
              <Badge variant="warning">
                <Lock className="mr-1 h-3 w-3" />
                {t("private")}
              </Badge>
            )}
            <span className="text-sm text-[var(--fg)]/40">
              {t("stats", { count: dictionary.words.length, max: 500 })}
            </span>
          </div>
        </div>

        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab("settings")}
            className={
              activeTab === "settings" ? "bg-[var(--surface-hover)]" : ""
            }
          >
            <Settings className="mr-2 h-4 w-4" />
            {tCommon("settings")}
          </Button>
        )}
      </div>

      {showTour && (
        <DictionaryTour hasCompletedTour={false} userId={currentUserId || ""} />
      )}

      {/* Tabs */}
      <div
        id="dictionary-tabs"
        className="mb-6 flex gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "flashcards") {
                router.push(
                  `/${locale}/dictionary/${dictionary.id}/flashcards`,
                );
              } else if (tab.id === "quiz") {
                router.push(`/${locale}/dictionary/${dictionary.id}/quiz`);
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={`cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-lg font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[var(--bg)] shadow-sm"
                : "text-[var(--fg)]/50 hover:text-[var(--fg)]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "words" && (
        <div className="space-y-4">
          {canEdit && (
            <>
              <div id="add-word-section" className="relative z-20">
                <AddWordForm
                  dictionaryId={dictionary.id}
                  dictionaryLanguage={dictionary.language}
                  onWordAdded={refreshDictionary}
                  wordCount={dictionary.words.length}
                />
              </div>
              <div id="magic-words-section" className="relative z-10">
                <MagicWords
                  dictionaryId={dictionary.id}
                  title={dictionary.title}
                  description={dictionary.description}
                  language={dictionary.language}
                  sourceLanguage={locale}
                  existingWords={existingWords}
                  initialSuggestions={dictionary.activeMagicWords}
                  onWordAdded={refreshDictionary}
                />
              </div>
            </>
          )}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
            <WordList
              words={dictionary.words}
              onUpdate={refreshDictionary}
              onShowPhrases={(wordId) => setSelectedWordId(wordId)}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <DictionarySettings
          dictionary={dictionary}
          isOwner={isOwner}
          onUpdate={refreshDictionary}
        />
      )}

      {/* Example phrases popup */}
      {selectedWordId &&
        (() => {
          const word = dictionary.words.find((w) => w.id === selectedWordId);
          if (!word) return null;
          return (
            <ExamplePhrasePopup
              isOpen={true}
              onClose={() => setSelectedWordId(null)}
              wordId={word.id}
              wordTitle={word.title}
              wordTranslation={word.translation}
            />
          );
        })()}
    </div>
  );
}
