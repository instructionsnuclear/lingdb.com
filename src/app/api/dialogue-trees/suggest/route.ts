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

  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { conversationLine, language, currentPhrase, isRefresh } = result.data;

  // Rate limiting: 5 AI generations per minute and 30 per hour
  const isAllowedPerMinute = await checkRateLimit(
    dbUser.id,
    "dialogue_tree_suggest",
    { limit: 5, windowMs: 60 * 1000 },
  );

  if (!isAllowedPerMinute) {
    return NextResponse.json(
      {
        error:
          "Rate limit reached: Maximum 5 AI generations per minute. Please wait a moment.",
      },
      { status: 429 },
    );
  }

  const isAllowedPerHour = await checkRateLimit(
    dbUser.id,
    "dialogue_tree_suggest",
    { limit: 30, windowMs: 60 * 60 * 1000 },
  );

  if (!isAllowedPerHour) {
    return NextResponse.json(
      {
        error:
          "Rate limit reached: Maximum 30 AI generations per hour. Please try again later.",
      },
      { status: 429 },
    );
  }

  // Credit check: Only explicit refresh consumes 1 AI credit; auto-generated responses are free
  if (isRefresh && dbUser.aiCredits <= 0) {
    return NextResponse.json(
      {
        error:
          "No AI credits remaining to refresh suggestions. Upgrade to Plus for more.",
      },
      { status: 403 },
    );
  }

  const languageName = LANGUAGE_NAMES[language] || "English";

  const formattedConversation = conversationLine
    .map((phrase, idx) => `Speaker ${idx % 2 === 0 ? "A" : "B"}: "${phrase}"`)
    .join("\n");

  const systemPrompt = `You are a conversational language learning tutor.
The user is building an interactive dialogue tree in ${languageName}.
A dialogue tree explores how many different, natural ways a conversation can continue.

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
3. Do not include quotes, speaker labels, or numbers inside the string values.
4. Keep each response concise (1-2 sentences max), realistic for everyday spoken communication.

Respond STRICTLY with a valid JSON object in this exact shape:
{
  "suggestions": [
    "First potential continuation in ${languageName}",
    "Second potential continuation in ${languageName}",
    "Third potential continuation in ${languageName}"
  ]
}`;

  try {
    const response = await fetchOpenRouterChatCompletion({
      apiKey: openRouterKey,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Provide 3 natural continuations for: "${currentPhrase}"`,
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

    let parsed: { suggestions?: string[] };
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

    let suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(Boolean)
      : [];

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "No suggestions received." },
        { status: 500 },
      );
    }

    suggestions = suggestions.slice(0, 3).map((s) => s.trim());

    // Log the generation activity for rate limiting
    await logActivity(dbUser.id, "dialogue_tree_suggest", {
      isRefresh: Boolean(isRefresh),
      language,
    });

    let updatedCredits = dbUser.aiCredits;
    if (isRefresh) {
      // Deduct 1 AI credit only when user explicitly clicked refresh
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
