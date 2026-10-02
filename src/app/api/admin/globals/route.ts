import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users, siteGlobals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SITE_GLOBALS, SiteGlobalsData } from "@/lib/constants/globals-defaults";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  return dbUser?.role === "ADMIN" ? dbUser : null;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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

    return NextResponse.json(DEFAULT_SITE_GLOBALS);
  } catch (error) {
    console.error("Admin globals fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as SiteGlobalsData;

    if (!Array.isArray(body.navLinks) || !Array.isArray(body.footerLinks)) {
      return NextResponse.json(
        { error: "Invalid payload formatting" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .insert(siteGlobals)
      .values({
        id: "default",
        navLinks: body.navLinks,
        footerLinks: body.footerLinks,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: siteGlobals.id,
        set: {
          navLinks: body.navLinks,
          footerLinks: body.footerLinks,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      navLinks: updated.navLinks,
      footerLinks: updated.footerLinks,
    });
  } catch (error) {
    console.error("Admin globals update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
