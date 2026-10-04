import { http } from "@/lib/api/http";
import type {
  DictionaryList,
  Dictionary,
  Word,
  SavedPlaygroundPhrase,
} from "@/lib/db/schema";

export type { SavedPlaygroundPhrase };

export interface EnrichedDictionaryList extends DictionaryList {
  dictionaries: Array<{ id: string; title: string; language: string }>;
  dictionaryCount: number;
}

export interface PlaygroundDictionary extends Dictionary {
  words: Word[];
}

export interface SuggestedWordItem {
  title: string;
  translation: string;
  dictionaryId?: string;
  dictionaryTitle?: string;
}

export interface GeneratedPhrase {
  context?: string;
  phrase: string;
  translation: string;
  matchedWords?: string[];
  suggestedWords?: SuggestedWordItem[];
}

export async function getDictionaryLists() {
  return http<{ lists: EnrichedDictionaryList[] }>("/api/dictionary-lists");
}

export async function createDictionaryList(payload: {
  title: string;
  language: string;
  dictionaryIds: string[];
}) {
  return http<{ list: DictionaryList }>("/api/dictionary-lists", {
    method: "POST",
    body: payload,
  });
}

export async function deleteDictionaryList(id: string) {
  return http<{ success: boolean }>(`/api/dictionary-lists/${id}`, {
    method: "DELETE",
  });
}

export async function updateDictionaryList(
  id: string,
  payload: {
    title?: string;
    dictionaryIds?: string[];
    positions?: Record<string, { x: number; y: number }>;
    savedPhrases?: SavedPlaygroundPhrase[];
  },
) {
  return http<{ list: DictionaryList }>(`/api/dictionary-lists/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function updateDictionaryListPositions(
  id: string,
  positions: Record<string, { x: number; y: number }>,
) {
  return http<{ list: DictionaryList }>(`/api/dictionary-lists/${id}`, {
    method: "PATCH",
    body: { positions },
  });
}

export async function updateDictionaryListSavedPhrases(
  id: string,
  savedPhrases: SavedPlaygroundPhrase[],
) {
  return http<{ list: DictionaryList }>(`/api/dictionary-lists/${id}`, {
    method: "PATCH",
    body: { savedPhrases },
  });
}

export async function getPlaygroundDictionaries(ids: string[]) {
  const query = encodeURIComponent(ids.join(","));
  return http<{ dictionaries: PlaygroundDictionary[] }>(
    `/api/playground/dictionaries?ids=${query}`,
  );
}

export async function generatePlaygroundPhrases(payload: {
  words: Array<{ title: string; translation: string; dictionaryId?: string }>;
  language: string;
  dictionaries?: Array<{ id: string; title: string }>;
}) {
  return http<{
    phrases: GeneratedPhrase[];
    creditsRemaining: number;
  }>("/api/ai/playground-phrases", {
    method: "POST",
    body: payload,
  });
}
