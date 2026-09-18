// Serverless proxy: keeps the Anthropic API key on the server (env var),
// never exposing it to the browser. The frontend POSTs { text } here.

const SYSTEM_PROMPT = "You are a professional writing coach. Analyse the tone of the writing. Respond with three sections: OVERALL TONE, WHAT'S WORKING (3 bullets), WHAT TO CONSIDER (3 bullets). Be specific.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: "Server is missing ANTHROPIC_API_KEY." } });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const text = (body.text || "").trim();
    if (!text) {
      res.status(400).json({ error: { message: "No text provided." } });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }]
      })
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message || "Unexpected server error." } });
  }
}
