import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaryLists, dictionaries, users } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { z } from "zod";

const createListSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  language: z.enum(["en", "fr", "de", "es", "tr"]),
  dictionaryIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one dictionary"),
});

// GET /api/dictionary-lists — list user's dictionary packs
export async function GET() {
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

  const lists = await db.query.dictionaryLists.findMany({
    where: eq(dictionaryLists.userId, dbUser.id),
    orderBy: [desc(dictionaryLists.updatedAt)],
  });

  // Collect all unique dictionary IDs across lists to fetch their titles
  const allDictIds = Array.from(
    new Set(lists.flatMap((l) => l.dictionaryIds || [])),
  );

  const dictMetadata = allDictIds.length
    ? await db.query.dictionaries.findMany({
        where: inArray(dictionaries.id, allDictIds),
        columns: {
          id: true,
          title: true,
          language: true,
        },
      })
    : [];

  const dictMap = new Map(dictMetadata.map((d) => [d.id, d]));

  const enrichedLists = lists.map((list) => {
    const listDicts = (list.dictionaryIds || [])
      .map((id) => dictMap.get(id))
      .filter(Boolean) as Array<{ id: string; title: string; language: string }>;

    return {
      ...list,
      dictionaries: listDicts,
      dictionaryCount: listDicts.length,
    };
  });

  return NextResponse.json({ lists: enrichedLists });
}

// POST /api/dictionary-lists — create a new dictionary pack
export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const result = createListSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { title, language, dictionaryIds } = result.data;

  // Validate that all dictionaries belong to this user and match the specified language
  const userDicts = await db.query.dictionaries.findMany({
    where: inArray(dictionaries.id, dictionaryIds),
    columns: {
      id: true,
      userId: true,
      language: true,
      title: true,
    },
  });

  if (userDicts.length !== dictionaryIds.length) {
    return NextResponse.json(
      { error: "One or more selected dictionaries do not exist" },
      { status: 400 },
    );
  }

  const hasInvalidOwner = userDicts.some((d) => d.userId !== dbUser.id);
  if (hasInvalidOwner) {
    return NextResponse.json(
      { error: "You can only pack dictionaries that you own" },
      { status: 403 },
    );
  }

  const hasMismatchedLanguage = userDicts.some((d) => d.language !== language);
  if (hasMismatchedLanguage) {
    return NextResponse.json(
      {
        error:
          "All dictionaries in a list must have the same dictionary language",
      },
      { status: 400 },
    );
  }

  const [newList] = await db
    .insert(dictionaryLists)
    .values({
      userId: dbUser.id,
      title,
      language,
      dictionaryIds,
    })
    .returning();

  return NextResponse.json({ list: newList }, { status: 201 });
}
