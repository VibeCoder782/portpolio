import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { system, messages, max_tokens = 1000 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages is required" });
  }

  // Groq은 OpenAI 호환 형식 사용 (system은 첫 번째 메시지로 삽입)
  const groqMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    // App.tsx가 기대하는 Anthropic 형식으로 통일해서 반환
    const text = data.choices?.[0]?.message?.content ?? "응답을 가져오지 못했습니다.";
    return res.status(200).json({
      content: [{ type: "text", text }],
    });
  } catch (err) {
    console.error("Groq API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
