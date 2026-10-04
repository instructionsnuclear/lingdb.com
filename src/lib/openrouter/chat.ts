type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChatOptions = {
  apiKey: string;
  messages: OpenRouterMessage[];
  extraBody?: Record<string, unknown>;
  model?: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_PRIMARY_MODEL = "mistralai/mistral-small-creative";

function getOpenRouterModels() {
  const primaryModel =
    process.env.OPENROUTER_PRIMARY_MODEL?.trim() ||
    DEFAULT_OPENROUTER_PRIMARY_MODEL;
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL?.trim() || "";

  return { primaryModel, fallbackModel };
}

function shouldUseFallback(status: number, errorText: string) {
  if ([404, 429, 502, 503, 504].includes(status)) {
    return true;
  }

  const normalized = errorText.toLowerCase();
  const hasModelSignal = normalized.includes("model");
  const hasAvailabilitySignal =
    normalized.includes("unavailable") ||
    normalized.includes("not found") ||
    normalized.includes("no endpoints") ||
    normalized.includes("overloaded") ||
    normalized.includes("capacity");

  return hasModelSignal && hasAvailabilitySignal;
}

export async function fetchOpenRouterChatCompletion({
  apiKey,
  messages,
  extraBody,
  model,
}: OpenRouterChatOptions) {
  const { primaryModel, fallbackModel } = getOpenRouterModels();
  const selectedModel = model?.trim() || primaryModel;

  const requestWithModel = async (m: string) =>
    fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL
          ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
          : "http://localhost:3000",
        "X-Title": "Lingdb",
      },
      body: JSON.stringify({
        model: m,
        messages,
        ...(extraBody || {}),
      }),
    });

  const primaryResponse = await requestWithModel(selectedModel);

  if (primaryResponse.ok || !fallbackModel || fallbackModel === selectedModel) {
    return primaryResponse;
  }

  const primaryErrorText = await primaryResponse.clone().text();
  if (!shouldUseFallback(primaryResponse.status, primaryErrorText)) {
    return primaryResponse;
  }

  console.warn(
    `OpenRouter model '${selectedModel}' unavailable, retrying with fallback '${fallbackModel}'.`,
  );

  return requestWithModel(fallbackModel);
}
