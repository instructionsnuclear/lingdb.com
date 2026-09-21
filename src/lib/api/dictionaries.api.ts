import { http } from "@/lib/api/http";
import type { Dictionary } from "@/lib/db/schema";

export async function getDictionary(id: string) {
  return http<{ dictionary: Record<string, unknown> }>(
    `/api/dictionaries/${id}`,
  );
}

export async function createDictionary(payload: Record<string, unknown>) {
  return http<{ dictionary: Dictionary }>("/api/dictionaries", {
    method: "POST",
    body: payload,
  });
}

export async function updateDictionary(
  id: string,
  payload: Record<string, unknown>,
) {
  return http<unknown>(`/api/dictionaries/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteDictionary(id: string) {
  return http<unknown>(`/api/dictionaries/${id}`, {
    method: "DELETE",
  });
}

export async function inviteDictionaryEditor(
  id: string,
  payload: Record<string, unknown>,
) {
  return http<unknown>(`/api/dictionaries/${id}/editors`, {
    method: "POST",
    body: payload,
  });
}

export async function removeDictionaryEditor(id: string, userId: string) {
  return http<unknown>(`/api/dictionaries/${id}/editors/${userId}`, {
    method: "DELETE",
  });
}

export async function leaveDictionary(id: string) {
  return http<unknown>(`/api/dictionaries/${id}/editors/me`, {
    method: "DELETE",
  });
}

export async function forkDictionary(sourceDictionaryId: string) {
  return http<{ dictionaryId: string }>("/api/dictionaries/fork", {
    method: "POST",
    body: { sourceDictionaryId },
  });
}
