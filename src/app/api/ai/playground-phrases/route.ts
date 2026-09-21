import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchOpenRouterChatCompletion } from "@/lib/openrouter/chat";
import { z } from "zod";

const requestSchema = z.object({
  words: z
    .array(
      z.object({
        title: z.string().min(1),
        translation: z.string().min(1),
        dictionaryId: z.string().optional(),
      }),
    )
    .min(1, "Select at least one word"),
  language: z.enum(["en", "fr", "de", "es", "tr"]),
  dictionaries: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .optional(),
});

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  tr: "Turkish",
};

export async function POST(request: NextRequest) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY" },
      { status: 500 },
    );
  }

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

  if (dbUser.aiCredits <= 0) {
    return NextResponse.json(
      { error: "No AI credits remaining. Upgrade to Plus for more." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { words: selectedWords, language, dictionaries: availableDicts = [] } =
    result.data;
  const languageName = LANGUAGE_NAMES[language] || "German";

  const wordsListDescription = selectedWords
    .map((w) => `"${w.title}" (${w.translation})`)
    .join(", ");

  const dictsGuide =
    availableDicts.length > 0
      ? `\nAVAILABLE DICTIONARIES:
${availableDicts.map((d) => `- ID: "${d.id}", Title: "${d.title}"`).join("\n")}

CRITICAL INSTRUCTION FOR "suggestedWords":
For every suggested word in "suggestedWords", you MUST assign the "dictionaryId" of the dictionary it best fits into based on the dictionary title (for example: place verbs into a dictionary for Verbs/Fiiller, adverbs into Adverbs/Zarflar, nouns into Nouns/İsimler, etc.). You must use one of the exact IDs from the AVAILABLE DICTIONARIES list above.`
      : "";

  const systemPrompt = `You are a high-level language tutor. Given a set of vocabulary words in ${languageName}, generate exactly 3 natural, high-quality, fluent example sentences.
Focus on natural, realistic usage and standard everyday phrasing. Do not force artificial contexts or awkward scenarios—prioritize natural flow and grammatical correctness.
In each sentence, naturally incorporate the provided words where sensible.

CRITICAL INSTRUCTION FOR "matchedWords":
In the "matchedWords" array for each sentence, you MUST list the exact word forms and inflected/conjugated variations as they appear in the sentence that correspond to any of the chosen words.
Examples:
- If a chosen word is "treffen" and the sentence uses "trifft" or "treffe", include "trifft" or "treffe" in matchedWords.
- If a chosen word is "abholen" and the sentence uses "abholt", include "abholt" in matchedWords.
- If a chosen word is conjugated, declined, pluralized, or split in the sentence, include those exact word tokens in matchedWords.

In addition, extract 2 to 3 other useful vocabulary words that appear in that sentence (words other than the ones provided) as suggestions for the user to add to their dictionary, along with their English translations.
${dictsGuide}

You MUST respond strictly with a valid JSON object in this exact shape, without any markdown formatting or explanations:
{
  "phrases": [
    {
      "phrase": "Sentence in ${languageName}",
      "translation": "English translation",
      "matchedWords": ["exact_word_in_sentence", "conjugated_variation_in_sentence"],
      "suggestedWords": [
        {
          "title": "word_in_${languageName}",
          "translation": "english_meaning",
          "dictionaryId": "exact_dictionary_id_it_fits_into"
        }
      ]
    }
  ]
}`;

  const userPrompt = `Selected words to combine in ${languageName}: ${wordsListDescription}`;

  try {
    const response = await fetchOpenRouterChatCompletion({
      apiKey: openRouterKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", await response.text());
      return NextResponse.json(
        { error: "AI generation failed. Please try again." },
        { status: 500 },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";

    let parsed: {
      phrases?: Array<{
        phrase: string;
        translation: string;
        matchedWords?: string[];
        suggestedWords?: Array<{
          title: string;
          translation: string;
          dictionaryId?: string;
        }>;
        context?: string;
      }>;
    };

    try {
      const cleaned = rawContent
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 },
      );
    }

    const rawPhrases = Array.isArray(parsed.phrases) ? parsed.phrases : [];

    if (rawPhrases.length === 0) {
      return NextResponse.json(
        { error: "No phrases generated. Please try again." },
        { status: 500 },
      );
    }

    // Process phrases and resolve destination dictionary for each suggested word
    const phrases = rawPhrases.map((p) => ({
      phrase: p.phrase,
      translation: p.translation,
      matchedWords: p.matchedWords || [],
      suggestedWords: (p.suggestedWords || []).map((sugg) => {
        let assignedId = sugg.dictionaryId;
        const exists = availableDicts.some((d) => d.id === assignedId);

        if (!exists && availableDicts.length > 0) {
          // Fallback heuristic: check grammatical markers against dictionary titles
          const lower = sugg.title.toLowerCase();
          const isVerb =
            lower.endsWith("en") ||
            lower.endsWith("eln") ||
            lower.endsWith("ern") ||
            lower.endsWith("mak") ||
            lower.endsWith("mek");
          const isNoun =
            sugg.title[0] === sugg.title[0]?.toUpperCase() &&
            sugg.title[0] !== sugg.title[0]?.toLowerCase();

          const matchedByRole = availableDicts.find((d) => {
            const dt = d.title.toLowerCase();
            if (isVerb && (dt.includes("verb") || dt.includes("fiil")))
              return true;
            if (isNoun && (dt.includes("noun") || dt.includes("isim")))
              return true;
            if (!isVerb && !isNoun && (dt.includes("adverb") || dt.includes("zarf")))
              return true;
            return false;
          });

          assignedId = matchedByRole ? matchedByRole.id : availableDicts[0].id;
        }

        const resolvedDict = availableDicts.find((d) => d.id === assignedId);

        return {
          title: sugg.title,
          translation: sugg.translation,
          dictionaryId: assignedId,
          dictionaryTitle: resolvedDict?.title,
        };
      }),
    }));

    // Deduct 1 credit
    await db
      .update(users)
      .set({ aiCredits: dbUser.aiCredits - 1 })
      .where(eq(users.id, dbUser.id));

    return NextResponse.json({
      phrases,
      creditsRemaining: dbUser.aiCredits - 1,
    });
  } catch (err) {
    console.error("Playground phrase generation error:", err);
    return NextResponse.json(
      { error: "AI generation failed. Please try again." },
      { status: 500 },
    );
  }
}
