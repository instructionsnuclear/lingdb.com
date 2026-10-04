import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchOpenRouterChatCompletion } from "@/lib/openrouter/chat";
import { checkRateLimit, logActivity } from "@/lib/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  conversationLine: z.array(z.string()).min(1),
  language: z.string().min(1),
  currentPhrase: z.string().min(1),
  isRefresh: z.boolean().optional(),
  metaContext: z.string().max(5000).nullable().optional(),
  level: z.string().nullable().optional(),
  translationLanguage: z.string().optional(),
});

const CEFR_LEVEL_GUIDES: Record<string, string> = {
  A1: "A1 (Beginner - strictly use simple vocabulary, basic short sentences, elementary present tense, everyday basic words)",
  A2: "A2 (Elementary - simple conversational structures, routine familiar exchanges, simple connectors)",
  B1: "B1 (Intermediate - standard conversational language, clear straightforward sentences, everyday idioms)",
  B2: "B2 (Upper Intermediate - varied vocabulary, more complex sentence structures, nuanced conversational phrases)",
  C1: "C1 (Advanced - sophisticated vocabulary, natural idioms, complex grammar, stylistic subtlety)",
  C2: "C2 (Mastery - native-level eloquence, rich figurative language, highly nuanced conversational mastery)",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  tr: "Turkish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  nl: "Dutch",
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

  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const {
    conversationLine,
    language,
    currentPhrase,
    isRefresh,
    metaContext,
    level,
    translationLanguage,
  } = result.data;

  // Rate limiting: 5 AI generations per minute and 30 per hour (Admins get 60/min and 500/hour)
  const isAdmin = dbUser.role === "ADMIN";
  const minuteLimit = isAdmin ? 60 : 5;
  const hourlyLimit = isAdmin ? 500 : 30;

  const isAllowedPerMinute = await checkRateLimit(
    dbUser.id,
    "dialogue_tree_suggest",
    { limit: minuteLimit, windowMs: 60 * 1000 },
  );

  if (!isAllowedPerMinute) {
    return NextResponse.json(
      {
        error: `Rate limit reached: Maximum ${minuteLimit} AI generations per minute. Please wait a moment.`,
      },
      { status: 429 },
    );
  }

  const isAllowedPerHour = await checkRateLimit(
    dbUser.id,
    "dialogue_tree_suggest",
    { limit: hourlyLimit, windowMs: 60 * 60 * 1000 },
  );

  if (!isAllowedPerHour) {
    return NextResponse.json(
      {
        error: `Rate limit reached: Maximum ${hourlyLimit} AI generations per hour. Please try again later.`,
      },
      { status: 429 },
    );
  }

  // Credit check: Only explicit refresh consumes 1 AI credit; auto-generated responses are free (Admins have unlimited refreshes)
  if (isRefresh && !isAdmin && dbUser.aiCredits <= 0) {
    return NextResponse.json(
      {
        error:
          "No AI credits remaining to refresh suggestions. Upgrade to Plus for more.",
      },
      { status: 403 },
    );
  }

  const languageName = LANGUAGE_NAMES[language.toLowerCase()] || language || "English";
  const targetTranslationLang = translationLanguage || "en";
  const targetTranslationLangName =
    LANGUAGE_NAMES[targetTranslationLang.toLowerCase()] ||
    targetTranslationLang ||
    "English";

  const formattedConversation = conversationLine
    .map((phrase, idx) => `Speaker ${idx % 2 === 0 ? "A" : "B"}: "${phrase}"`)
    .join("\n");

  const targetLevel = level && CEFR_LEVEL_GUIDES[level] ? level : "B1";
  const levelDescription = CEFR_LEVEL_GUIDES[targetLevel];

  const metaContextSection =
    metaContext && metaContext.trim().length > 0
      ? `
SCENARIO META CONTEXT & MEMORY (Fake RAG Border):
"""
${metaContext.trim().slice(0, 5000)}
"""

CRITICAL RULE FOR META CONTEXT:
The meta context above defines the background scenario, character roles, domain knowledge, and memory border.
It acts as memory and a context boundary to prevent suggestions from drifting out of context.
It must NOT hijack or break the natural flow of the conversation, nor force unnatural exposition. Keep the continuations sounding like authentic human speech in reaction to "${currentPhrase}", while remaining true to the roles, setting, and domain defined in this memory border.`
      : "";

  const systemPrompt = `You are a conversational language learning tutor.
The user is building an interactive dialogue tree in ${languageName}.
A dialogue tree explores how many different, natural ways a conversation can continue.

TARGET LANGUAGE LEVEL:
CEFR ${targetLevel} - ${levelDescription}
Suggested phrases MUST match this language complexity and vocabulary level appropriately for a learner.
${metaContextSection}

CONVERSATION LINE CONTEXT (from starting phrase to the latest phrase):
${formattedConversation}

LATEST PHRASE THAT NEEDS RESPONSES:
"${currentPhrase}"

CRITICAL INSTRUCTIONS:
1. Generate exactly 3 distinct, realistic, and natural potential responses or continuations to "${currentPhrase}" in ${languageName}.
2. Ensure each option represents a distinct conversational path, tone, or perspective (e.g.:
   - Option 1: Positive, enthusiastic, or detailed answer
   - Option 2: Casual, concise, or direct answer
   - Option 3: Counter-question, topic redirection, or alternative nuance).
3. Do not include quotes, speaker labels, or numbers inside the phrase string values.
4. Keep each response concise (1-2 sentences max), realistic for everyday spoken communication.
5. Provide a faithful, accurate, and natural translation for each phrase in ${targetTranslationLangName} ("translation" field).
6. Strictly adhere to CEFR Level ${targetLevel}.
${metaContext && metaContext.trim().length > 0 ? "7. Respect the scenario meta context memory border so suggestions remain thematically coherent." : ""}

Respond STRICTLY with a valid JSON object in this exact shape:
{
  "suggestions": [
    {
      "phrase": "First potential continuation in ${languageName}",
      "translation": "Accurate natural translation in ${targetTranslationLangName}"
    },
    {
      "phrase": "Second potential continuation in ${languageName}",
      "translation": "Accurate natural translation in ${targetTranslationLangName}"
    },
    {
      "phrase": "Third potential continuation in ${languageName}",
      "translation": "Accurate natural translation in ${targetTranslationLangName}"
    }
  ]
}`;

  try {
    const response = await fetchOpenRouterChatCompletion({
      apiKey: openRouterKey,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Provide 3 natural continuations with ${targetTranslationLangName} translations for: "${currentPhrase}"`,
        },
      ],
    });

    if (!response.ok) {
      console.error("OpenRouter suggest error:", await response.text());
      return NextResponse.json(
        { error: "AI generation failed. Please try again." },
        { status: 500 },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";

    let parsed: any;
    try {
      const cleaned = rawContent
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response." },
        { status: 500 },
      );
    }

    const parseSuggestionItem = (
      item: unknown,
    ): { phrase: string; translation: string } | null => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { phrase: text, translation: "" } : null;
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const phrase =
          typeof obj.phrase === "string"
            ? obj.phrase.trim()
            : typeof obj.text === "string"
              ? obj.text.trim()
              : "";
        const translation =
          typeof obj.translation === "string" ? obj.translation.trim() : "";
        if (phrase) {
          return { phrase, translation };
        }
      }
      return null;
    };

    let suggestions: { phrase: string; translation: string }[] = [];

    if (Array.isArray(parsed?.suggestions)) {
      suggestions = parsed.suggestions
        .map(parseSuggestionItem)
        .filter(
          (item: unknown): item is { phrase: string; translation: string } =>
            Boolean(item),
        );
    } else if (Array.isArray(parsed)) {
      suggestions = parsed
        .map(parseSuggestionItem)
        .filter(
          (item: unknown): item is { phrase: string; translation: string } =>
            Boolean(item),
        );
    }

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "No suggestions received." },
        { status: 500 },
      );
    }

    suggestions = suggestions.slice(0, 3);

    // Log the generation activity for rate limiting
    await logActivity(dbUser.id, "dialogue_tree_suggest", {
      isRefresh: Boolean(isRefresh),
      language,
    });

    let updatedCredits = dbUser.aiCredits;
    if (isRefresh && !isAdmin) {
      // Deduct 1 AI credit only when regular user explicitly clicked refresh
      updatedCredits = Math.max(0, dbUser.aiCredits - 1);
      await db
        .update(users)
        .set({ aiCredits: updatedCredits })
        .where(eq(users.id, dbUser.id));
    }

    return NextResponse.json({
      suggestions,
      creditsRemaining: updatedCredits,
    });
  } catch (err) {
    console.error("AI Suggest route error:", err);
    return NextResponse.json(
      { error: "AI suggestion failed." },
      { status: 500 },
    );
  }
}
