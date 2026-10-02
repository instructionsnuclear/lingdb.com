import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { siteGlobals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SITE_GLOBALS, SiteGlobalsData } from "@/lib/constants/globals-defaults";

export async function GET() {
  try {
    const existing = await db.query.siteGlobals.findFirst({
      where: eq(siteGlobals.id, "default"),
    });

    if (existing) {
      return NextResponse.json({
        navLinks: existing.navLinks as SiteGlobalsData["navLinks"],
        footerLinks: existing.footerLinks as SiteGlobalsData["footerLinks"],
      });
    }

    // Auto-seed default globals if not present in DB
    await db
      .insert(siteGlobals)
      .values({
        id: "default",
        navLinks: DEFAULT_SITE_GLOBALS.navLinks,
        footerLinks: DEFAULT_SITE_GLOBALS.footerLinks,
      })
      .onConflictDoNothing();

    return NextResponse.json(DEFAULT_SITE_GLOBALS);
  } catch (error) {
    console.error("Error fetching site globals:", error);
    return NextResponse.json(DEFAULT_SITE_GLOBALS);
  }
}
