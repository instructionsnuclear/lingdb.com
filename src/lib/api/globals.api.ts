import { http } from "@/lib/api/http";
import { SiteGlobalsData } from "@/lib/constants/globals-defaults";

export async function fetchPublicGlobals() {
  return http<SiteGlobalsData>("/api/globals");
}

export async function fetchAdminGlobals() {
  return http<SiteGlobalsData>("/api/admin/globals");
}

export async function updateAdminGlobals(payload: SiteGlobalsData) {
  return http<SiteGlobalsData>("/api/admin/globals", {
    method: "PUT",
    body: payload,
  });
}
