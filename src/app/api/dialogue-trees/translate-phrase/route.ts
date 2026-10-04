import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchOpenRouterChatCompletion } from "@/lib/openrouter/chat";

const translatePhraseSchema = z.object({
  phrase: z.string().min(1).max(1000),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().min(1),
});

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

// In-memory cache for fast, repeated phrase translations
const phraseTranslationCache = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const result = translatePhraseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.issues },
        { status: 400 },
      );
    }

    const { phrase, sourceLanguage, targetLanguage } = result.data;
    const cleanPhrase = phrase.trim();

    const cacheKey = `${(sourceLanguage || "").toLowerCase()}:${targetLanguage.toLowerCase()}:${cleanPhrase.toLowerCase()}`;
    if (phraseTranslationCache.has(cacheKey)) {
      return NextResponse.json({
        translation: phraseTranslationCache.get(cacheKey),
      });
    }

    const targetLangName =
      LANGUAGE_NAMES[targetLanguage.toLowerCase()] ||
      targetLanguage ||
      "English";
    const sourceLangName = sourceLanguage
      ? LANGUAGE_NAMES[sourceLanguage.toLowerCase()] || sourceLanguage
      : "the source language";

    const systemPrompt = `You are a professional dialogue translator.
Translate the following conversational phrase from ${sourceLangName} accurately and naturally into ${targetLangName}.
Preserve tone, conversational nuances, and meaning.
Provide ONLY the translated text, without commentary, explanations, pronunciation guides, or quotes.
Respond STRICTLY with a valid JSON object:
{ "translation": "..." }`;

    const userPrompt = `Translate this phrase to ${targetLangName}:\n"${cleanPhrase}"`;

    const model =
      process.env.OPENROUTER_TRANSLATION_MODEL?.trim() ||
      process.env.OPENROUTER_PRIMARY_MODEL?.trim();

    const response = await fetchOpenRouterChatCompletion({
      apiKey: openRouterKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!response.ok) {
      console.error(
        "OpenRouter translate-phrase error:",
        await response.text(),
      );
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const cleaned = rawContent
      .replace(/```json?\n?/gi, "")
      .replace(/```/g, "")
      .trim();

    let translation = "";
    try {
      const parsed = JSON.parse(cleaned);
      translation = (parsed.translation || "").trim();
    } catch {
      translation = cleaned.replace(/^["']|["']$/g, "").trim();
    }

    if (!translation) {
      translation = cleaned;
    }

    // Cache the successful translation
    phraseTranslationCache.set(cacheKey, translation);

    return NextResponse.json({ translation });
  } catch (err: unknown) {
    console.error("translate-phrase error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
