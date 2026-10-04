import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchOpenRouterChatCompletion } from "@/lib/openrouter/chat";

const translateWordSchema = z.object({
  word: z.string().min(1).max(100),
  contextPhrase: z.string().max(500).optional(),
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

// In-memory cache for fast, repeated lookups
const wordTranslationCache = new Map<string, string>();

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
    const result = translateWordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.issues },
        { status: 400 },
      );
    }

    const { word, contextPhrase, sourceLanguage, targetLanguage } = result.data;
    const cleanWord = word.trim().toLowerCase();

    const cacheKey = `${(sourceLanguage || "").toLowerCase()}:${targetLanguage.toLowerCase()}:${cleanWord}`;
    if (wordTranslationCache.has(cacheKey)) {
      return NextResponse.json({
        translation: wordTranslationCache.get(cacheKey),
      });
    }

    const targetLangName =
      LANGUAGE_NAMES[targetLanguage.toLowerCase()] ||
      targetLanguage ||
      "English";
    const sourceLangName = sourceLanguage
      ? LANGUAGE_NAMES[sourceLanguage.toLowerCase()] || sourceLanguage
      : "the source language";

    const systemPrompt = `You are a professional dictionary translator.
Given a word used in context, provide the single most accurate, natural translation or concise meaning (1-3 words max) in ${targetLangName}.
Do NOT provide explanations, sentences, pronunciation notes, punctuation, or grammatical articles.
Respond STRICTLY with a valid JSON object:
{ "translation": "..." }`;

    const userPrompt = contextPhrase
      ? `Context sentence: "${contextPhrase}"\nWord to translate from ${sourceLangName} to ${targetLangName}: "${word}"`
      : `Translate this word from ${sourceLangName} to ${targetLangName}: "${word}"`;

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
        "OpenRouter translate-word error:",
        await response.text(),
      );
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const cleaned = content
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();

    let translation = "";
    try {
      const parsed = JSON.parse(cleaned);
      translation = String(parsed.translation || "").trim();
    } catch {
      translation = cleaned.replace(/["{}]/g, "").trim();
    }

    if (translation) {
      wordTranslationCache.set(cacheKey, translation);
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Translate word endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
