import { Router, type IRouter, type Request, type Response } from "express";
import { getOpenRouterClient, MODEL, classifyOpenRouterError } from "../lib/openrouter";

const router: IRouter = Router();

const DIFF_HINTS: Record<string, string> = {
  Easy:   "simple recall and basic concepts",
  Medium: "application and moderate reasoning",
  Hard:   "analysis, inference, and higher-order thinking",
};

// ── POST /api/quiz/generate ───────────────────────────────────────
router.post("/quiz/generate", async (req: Request, res: Response) => {
  const {
    subject,
    classLevel,
    numQuestions = 10,
    difficulty   = "Medium",
  } = req.body as {
    subject?:      string;
    classLevel?:   string | number;
    numQuestions?: number;
    difficulty?:   string;
  };

  if (!subject || !classLevel) {
    return res.status(400).json({ error: "subject and classLevel are required." });
  }

  const n    = Math.min(Math.max(Number(numQuestions), 1), 20);
  const diff = DIFF_HINTS[difficulty] ? difficulty : "Medium";
  const hint = DIFF_HINTS[diff];

  const prompt =
`You are a quiz generator for school students.

Generate exactly ${n} multiple-choice questions for a Class ${classLevel} student on the subject of ${subject} at ${diff} difficulty (${hint}).

Return a JSON object with a single key "questions" whose value is an array of exactly ${n} objects. Each object must have:
- "question": string — the question text
- "options": array of exactly 4 strings — the answer choices (each under 80 characters)
- "correct": number — 0-based index of the correct option (0=first, 1=second, 2=third, 3=fourth)
- "explanation": string — one sentence explaining why the correct answer is right

Example of the exact format required:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correct": 2,
      "explanation": "Paris is the capital and largest city of France."
    }
  ]
}

Important: respond with valid JSON only. No markdown, no code fences, no extra text.`;

  try {
    const openai     = getOpenRouterClient();
    const completion = await openai.chat.completions.create({
      model:           MODEL,
      messages:        [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw     = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();

    let parsed: Record<string, unknown>;
    try {
      // Try to find and parse JSON object
      const objStart = cleaned.indexOf("{");
      const objEnd   = cleaned.lastIndexOf("}");
      if (objStart === -1 || objEnd === -1) throw new Error("No JSON object found");
      parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1)) as Record<string, unknown>;
    } catch {
      console.error("Quiz JSON parse error. Raw output:", raw.slice(0, 500));
      return res.status(500).json({ error: "AI returned an invalid format. Please try again." });
    }

    // Support both { questions: [...] } and bare array responses
    let questions: unknown[] = [];
    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (Array.isArray(parsed["questions"])) {
      questions = parsed["questions"] as unknown[];
    } else {
      // Try any top-level array value
      const arrayVal = Object.values(parsed).find(Array.isArray);
      if (arrayVal) questions = arrayVal as unknown[];
    }

    if (questions.length === 0) {
      return res.status(500).json({ error: "AI returned an empty question set. Please try again." });
    }

    return res.json({ questions });
  } catch (err: unknown) {
    console.error("Quiz generate error:", err);
    const { status, message } = classifyOpenRouterError(err);
    return res.status(status).json({ error: message });
  }
});

export default router;
