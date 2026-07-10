import { Router, type IRouter, type Request, type Response } from "express";
import { getOpenRouterClient, MODEL, classifyOpenRouterError } from "../lib/openrouter";

const router: IRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUBJECT_INSTRUCTIONS: Record<string, string> = {
  Math:             "Solve step by step. Show all calculations clearly. Explain every step and never skip reasoning.",
  Science:          "Explain concepts simply with real-world examples. Use analogies when helpful.",
  English:          "Write grammatically correct answers. Use clear vocabulary appropriate for the class level.",
  History:          "Give accurate factual explanations. Include dates and context where relevant.",
  Geography:        "Explain with examples and references to real places. Include directional/spatial descriptions when helpful.",
  "Computer Science": "Explain clearly with code examples when relevant. Use simple analogies for abstract concepts.",
  Economics:        "Explain concepts with real-world examples. Use simple terms, relate to everyday life, and show calculations for numerical problems.",
  Civics:           "Explain constitutional, legal, and civic concepts clearly. Use examples from real governance and citizenship.",
};

// ── POST /api/ask ─────────────────────────────────────────────────
router.post("/ask", async (req: Request, res: Response) => {
  const { name, studentClass, subject, messages } = req.body as {
    name?: string;
    studentClass?: string;
    subject?: string;
    messages?: ChatMessage[];
  };

  // Validate required fields
  if (!name || !studentClass || !subject) {
    res.status(400).json({ error: "Missing required fields: name, studentClass, subject." });
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages must be a non-empty array." });
    return;
  }

  const subjectGuide =
    SUBJECT_INSTRUCTIONS[subject] ??
    `Explain clearly and accurately at the student's class level.`;

  const systemPrompt = `You are an expert, friendly teacher for school students.
Always tailor your answer to the student's class level.

Subject guidance for ${subject}:
${subjectGuide}

Never make up facts. If you are unsure, say so clearly.
Format answers with clear structure: use numbered steps, bullet points, and short paragraphs where appropriate.

Student name: ${name}
Class: ${studentClass}
Subject: ${subject}`;

  try {
    const openai   = getOpenRouterClient();
    const response = await openai.chat.completions.create({
      model:    MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const answer =
      response.choices[0]?.message?.content?.trim() ??
      "Sorry, I could not generate an answer. Please try again.";

    res.json({ answer });
  } catch (err: unknown) {
    req.log?.error({ err }, "OpenRouter /ask error");
    const { status, message } = classifyOpenRouterError(err);
    res.status(status).json({ error: message });
  }
});

export default router;
