import { http } from "@/lib/api/http";
import type { DialogueTree, DialogueTreeNode, Word } from "@/lib/db/schema";

export type { DialogueTree, DialogueTreeNode };

export interface CreateDialogueTreePayload {
  title: string;
  language: string;
  initialPhrase?: string;
  metaContext?: string;
  level?: string;
}

export interface UpdateDialogueTreePayload {
  title?: string;
  language?: string;
  nodes?: DialogueTreeNode[];
  pan?: { x: number; y: number };
  zoom?: number;
  metaContext?: string | null;
  level?: string | null;
}

export interface DialogueTreeSuggestionItem {
  phrase: string;
  translation?: string;
}

export type DialogueSuggestion = string | DialogueTreeSuggestionItem;

export interface SuggestDialogueResponsesPayload {
  conversationLine: string[];
  language: string;
  currentPhrase: string;
  isRefresh?: boolean;
  metaContext?: string | null;
  level?: string | null;
  translationLanguage?: string;
}

export interface SaveWordFromTreePayload {
  word: string;
  contextPhrase: string;
  dictionaryId: string;
  translation?: string;
}

export async function getDialogueTrees() {
  return http<{ trees: DialogueTree[] }>("/api/dialogue-trees");
}

export async function getDialogueTree(id: string) {
  return http<{ tree: DialogueTree }>(`/api/dialogue-trees/${id}`);
}

export async function createDialogueTree(payload: CreateDialogueTreePayload) {
  return http<{ tree: DialogueTree }>("/api/dialogue-trees", {
    method: "POST",
    body: payload,
  });
}

export async function updateDialogueTree(
  id: string,
  payload: UpdateDialogueTreePayload,
) {
  return http<{ tree: DialogueTree }>(`/api/dialogue-trees/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteDialogueTree(id: string) {
  return http<{ success: boolean }>(`/api/dialogue-trees/${id}`, {
    method: "DELETE",
  });
}

export async function suggestDialogueResponses(
  payload: SuggestDialogueResponsesPayload,
) {
  return http<{
    suggestions: DialogueTreeSuggestionItem[];
    creditsRemaining: number;
  }>("/api/dialogue-trees/suggest", {
    method: "POST",
    body: payload,
  });
}

export async function saveWordFromTree(payload: SaveWordFromTreePayload) {
  return http<{
    success: boolean;
    word: Word;
    dictionaryTitle: string;
  }>("/api/dialogue-trees/save-word", {
    method: "POST",
    body: payload,
  });
}

export interface TranslateWordPayload {
  word: string;
  contextPhrase?: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export async function translateWordFromTree(payload: TranslateWordPayload) {
  return http<{ translation: string }>("/api/dialogue-trees/translate-word", {
    method: "POST",
    body: payload,
  });
}

export interface TranslatePhrasePayload {
  phrase: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export async function translatePhraseFromTree(payload: TranslatePhrasePayload) {
  return http<{ translation: string }>(
    "/api/dialogue-trees/translate-phrase",
    {
      method: "POST",
      body: payload,
    },
  );
}

