import OpenAI from "openai";

export const MODEL = "gpt-5-mini";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"] ?? "",
    });
  }

  return _client;
}

export function classifyOpenAIError(err: unknown): {
  status: number;
  message: string;
} {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = typeof e["status"] === "number" ? e["status"] : 0;

    if (status === 401) {
      return {
        status: 502,
        message: "Invalid or missing OpenAI API key.",
      };
    }

    if (status === 429) {
      return {
        status: 429,
        message: "OpenAI rate limit reached. Please try again later.",
      };
    }

    if (status === 404) {
      return {
        status: 502,
        message: "The selected OpenAI model is unavailable.",
      };
    }

    if (status >= 500) {
      return {
        status: 502,
        message: "OpenAI is temporarily unavailable.",
      };
    }
  }

  return {
    status: 502,
    message: "The AI service encountered an unexpected error.",
  };
}
