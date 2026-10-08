import OpenAI from "openai";

export const MODEL = "openrouter/free";

let _client: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env["OPENROUTER_API_KEY"] ?? "",
      defaultHeaders: {
        "HTTP-Referer": "https://pandagpt-frontend-bdky.onrender.com",
        "X-Title": "PandaGPT",
      },
    });
  }

  return _client;
}

export function classifyOpenRouterError(err: unknown): {
  status: number;
  message: string;
} {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = typeof e["status"] === "number" ? e["status"] : 0;

    if (status === 401) {
      return {
        status: 502,
        message: "Invalid or missing OpenRouter API key.",
      };
    }

    if (status === 429) {
      return {
        status: 429,
        message: "OpenRouter free-model limit reached. Please try again later.",
      };
    }

    if (status === 404) {
      return {
        status: 502,
        message: "The selected free AI model is unavailable. Please try again later.",
      };
    }

    if (status >= 500) {
      return {
        status: 502,
        message: "OpenRouter is temporarily unavailable. Please try again later.",
      };
    }
  }

  return {
    status: 502,
    message: "The AI service encountered an unexpected error.",
  };
}
