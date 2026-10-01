import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { dictionaries, words, users, dictionaryEditors } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchOpenRouterChatCompletion } from "@/lib/openrouter/chat";
import { calculateNewStreak } from "@/lib/streak";
import { z } from "zod";

const saveWordSchema = z.object({
  word: z.string().min(1).max(100),
  contextPhrase: z.string().min(1).max(500),
  dictionaryId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
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
  const result = saveWordSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { word, contextPhrase, dictionaryId } = result.data;

  // Verify dictionary access
  const dict = await db.query.dictionaries.findFirst({
    where: eq(dictionaries.id, dictionaryId),
    with: {
      dictionaryEditors: {
        where: eq(dictionaryEditors.status, "ACCEPTED"),
      },
    },
  });

  if (!dict) {
    return NextResponse.json({ error: "Dictionary not found" }, { status: 404 });
  }

  const isOwner = dict.userId === dbUser.id;
  const isEditor = dict.dictionaryEditors?.some((ed) => ed.userId === dbUser.id);
  if (!isOwner && !isEditor) {
    return NextResponse.json({ error: "Unauthorized access to dictionary" }, { status: 403 });
  }

  // Check 500 word limit
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(words)
    .where(eq(words.dictionaryId, dict.id));

  if (count >= 500) {
    return NextResponse.json(
      { error: "Dictionary reached maximum limit of 500 words" },
      { status: 403 },
    );
  }

  // Check if word already exists in this dictionary (case-insensitive)
  const existingWord = await db.query.words.findFirst({
    where: and(
      eq(words.dictionaryId, dict.id),
      sql`lower(${words.title}) = lower(${word.trim()})`,
    ),
  });

  if (existingWord) {
    return NextResponse.json({
      success: true,
      word: existingWord,
      dictionaryTitle: dict.title,
    });
  }

  // Generate translation via AI based on dictionary language, name, and phrase context
  let translation = "";
  if (openRouterKey) {
    try {
      const systemPrompt = `You are a bilingual dictionary translator.
Given a word used in a specific sentence, translate this word into the dictionary's target language (${dict.language}).
Take into account the dictionary's title ("${dict.title}") and the sentence context to determine the precise meaning.
Provide ONLY the translated word or short meaning (1-3 words max), without explanations, articles, or punctuation.
Respond strictly in JSON format: { "translation": "..." }`;

      const userPrompt = `Sentence context: "${contextPhrase}"
Word to translate: "${word}"
Dictionary title: "${dict.title}"
Dictionary language: "${dict.language}"`;

      const aiRes = await fetchOpenRouterChatCompletion({
        apiKey: openRouterKey,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      if (aiRes.ok) {
        const json = await aiRes.json();
        const content = json.choices?.[0]?.message?.content || "";
        const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.translation) {
          translation = String(parsed.translation).trim();
        }
      }
    } catch (err) {
      console.warn("AI translation error for word save:", err);
    }
  }

  if (!translation) {
    translation = word; // Fallback
  }

  const [newWord] = await db
    .insert(words)
    .values({
      title: word.trim(),
      translation,
      dictionaryId: dict.id,
      order: count,
      lastModifiedById: dbUser.id,
    })
    .returning();

  // Update user statistics
  const newStreak = calculateNewStreak(dbUser.lastActiveDate, dbUser.streakCount);
  await db
    .update(users)
    .set({
      totalWords: dbUser.totalWords + 1,
      streakCount: newStreak,
      lastActiveDate: new Date(),
    })
    .where(eq(users.id, dbUser.id));

  return NextResponse.json({
    success: true,
    word: newWord,
    dictionaryTitle: dict.title,
  });
}
