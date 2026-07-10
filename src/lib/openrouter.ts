/**
 * Shared OpenRouter client and error-handling utilities.
 * All AI routes import from here so the key name lives in one place.
 */
import OpenAI from "openai";

export const MODEL = "openai/gpt-oss-20b:free";

/** Lazily-constructed singleton so the key is read after env is loaded. */
let _client: OpenAI | null = null;
export function getOpenRouterClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey:  process.env["OPENROUTER_API_KEY"] ?? "",
      defaultHeaders: {
        "HTTP-Referer": "https://pandagpt.repl.co",
        "X-Title":      "PandaGPT",
      },
    });
  }
  return _client;
}

/**
 * Translate OpenRouter / network errors into a user-facing message + HTTP status.
 * See https://openrouter.ai/docs#errors
 */
export function classifyOpenRouterError(err: unknown): { status: number; message: string } {
  // OpenAI SDK wraps HTTP errors as APIError with a .status field
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = typeof e["status"] === "number" ? e["status"] : 0;

    if (status === 401) {
      return { status: 502, message: "Invalid or missing OpenRouter API key. Please check your OPENROUTER_API_KEY secret." };
    }
    if (status === 402) {
      return { status: 502, message: "OpenRouter account has insufficient credits. Please top up at openrouter.ai." };
    }
    if (status === 404) {
      return { status: 502, message: "The AI model is unavailable on OpenRouter. Please contact support." };
    }
    if (status === 429) {
      return { status: 429, message: "Rate limit reached. Please wait a moment and try again." };
    }
    if (status === 503 || status === 504) {
      return { status: 502, message: "The AI model is temporarily unavailable. Please try again in a moment." };
    }
    if (status >= 500) {
      return { status: 502, message: "OpenRouter returned a server error. Please try again shortly." };
    }
  }

  // Network / timeout errors (no status field)
  if (err instanceof Error) {
    if (err.message.includes("fetch") || err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT")) {
      return { status: 502, message: "Could not reach OpenRouter. Please check your network and try again." };
    }
  }

  return { status: 502, message: "The AI service encountered an unexpected error. Please try again." };
}
