import { db } from "@/lib/db/client";
import { siteGlobals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SITE_GLOBALS, SiteGlobalsData } from "@/lib/constants/globals-defaults";
import GlobalsManagementClient from "@/components/admin/GlobalsManagementClient";

export default async function AdminGlobalsPage() {
  let globalsData: SiteGlobalsData = DEFAULT_SITE_GLOBALS;

  try {
    const existing = await db.query.siteGlobals.findFirst({
      where: eq(siteGlobals.id, "default"),
    });

    if (existing) {
      globalsData = {
        navLinks: existing.navLinks as SiteGlobalsData["navLinks"],
        footerLinks: existing.footerLinks as SiteGlobalsData["footerLinks"],
      };
    } else {
      await db
        .insert(siteGlobals)
        .values({
          id: "default",
          navLinks: DEFAULT_SITE_GLOBALS.navLinks,
          footerLinks: DEFAULT_SITE_GLOBALS.footerLinks,
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("Failed to load initial site globals:", error);
  }

  return <GlobalsManagementClient initialGlobals={globalsData} />;
}
