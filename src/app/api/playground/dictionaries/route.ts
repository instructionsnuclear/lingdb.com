import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaries, words, users, dictionaryEditors } from "@/lib/db/schema";
import { inArray, eq, or, and, asc } from "drizzle-orm";

// GET /api/playground/dictionaries?ids=id1,id2,id3
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, user.id),
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { error: "ids query parameter is required" },
      { status: 400 },
    );
  }

  const dictIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (dictIds.length === 0) {
    return NextResponse.json({ dictionaries: [] });
  }

  // Fetch the dictionaries
  const foundDicts = await db.query.dictionaries.findMany({
    where: inArray(dictionaries.id, dictIds),
    with: {
      words: {
        orderBy: (w, { asc }) => [asc(w.order), asc(w.createdAt)],
      },
      dictionaryEditors: {
        where: eq(dictionaryEditors.status, "ACCEPTED"),
      },
    },
  });

  // Verify that the user has permission to view each dictionary (is owner, editor, or public)
  const accessibleDicts = foundDicts.filter((d) => {
    if (d.isPublic) return true;
    if (d.userId === dbUser.id) return true;
    return d.dictionaryEditors.some((ed) => ed.userId === dbUser.id);
  });

  return NextResponse.json({ dictionaries: accessibleDicts });
}
