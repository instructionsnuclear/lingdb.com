import { http } from "@/lib/api/http";

type BlogTranslationPayload = {
  title?: string;
  description?: string;
  content?: string;
  keywords?: string;
  seoTitle?: string;
  seoDescription?: string;
};

type GeneratedAdminBlog = {
  title?: string;
  slug?: string;
  description?: string;
  content?: string;
  keywords?: string;
  seoTitle?: string;
  seoDescription?: string;
  schemaData?: Record<string, unknown>;
};

export async function deleteAdminUser(id: string) {
  return http<unknown>(`/api/admin/users/${id}`, { method: "DELETE" });
}

export async function updateAdminUserRole(id: string, role: "USER" | "ADMIN") {
  return http<unknown>(`/api/admin/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
}

export async function updateAdminUserCredits(id: string, aiCredits: number) {
  return http<unknown>(`/api/admin/users/${id}/credits`, {
    method: "PATCH",
    body: { aiCredits },
  });
}

export async function deleteModeratedDictionary(id: string) {
  return http<unknown>(`/api/admin/dictionaries/${id}`, { method: "DELETE" });
}

export async function updateModeratedDictionaryVisibility(
  id: string,
  isPublic: boolean,
) {
  return http<unknown>(`/api/admin/dictionaries/${id}/visibility`, {
    method: "PATCH",
    body: { isPublic },
  });
}

export async function saveAdminBlog(
  id: string | null,
  payload: Record<string, unknown>,
) {
  const url = id ? `/api/admin/blogs/${id}` : "/api/admin/blogs";
  const method = id ? "PATCH" : "POST";
  return http<unknown>(url, {
    method,
    body: payload,
  });
}

export async function deleteAdminBlog(id: string) {
  return http<unknown>(`/api/admin/blogs/${id}`, { method: "DELETE" });
}

export async function generateAdminBlog(prompt: string) {
  return http<GeneratedAdminBlog>("/api/admin/blogs/generate", {
    method: "POST",
    body: { prompt },
  });
}

export async function translateAdminBlog(blogId: string) {
  return http<{
    success: boolean;
    translations: Record<string, BlogTranslationPayload>;
  }>("/api/admin/blogs/translate", {
    method: "POST",
    body: { blogId },
  });
}
