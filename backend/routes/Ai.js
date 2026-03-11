const express = require("express");
const router = express.Router();
const https = require("https");

// POST /api/ai — proxy using Groq (free, fast, no credit card)
router.post("/", async (req, res) => {
  try {
    const { system, messages, max_tokens = 1000 } = req.body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ GROQ_API_KEY is not set in .env");
      return res.status(500).json({ error: "GROQ_API_KEY not set in .env" });
    }

    // Build messages array for Groq (OpenAI-compatible format)
    const groqMessages = [];
    if (system) {
      groqMessages.push({ role: "system", content: system });
    }
    if (messages?.length) {
      groqMessages.push(...messages);
    }

    const postBody = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      max_tokens,
      temperature: 0.7,
    });

    const groqResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(postBody),
        },
      };

      const reqHttp = https.request(options, (r) => {
        let body = "";
        r.on("data", (chunk) => (body += chunk));
        r.on("end", () => {
          try {
            resolve({ status: r.statusCode, data: JSON.parse(body) });
          } catch {
            reject(new Error("Failed to parse Groq response: " + body));
          }
        });
      });

      reqHttp.on("error", reject);
      reqHttp.write(postBody);
      reqHttp.end();
    });

    if (groqResponse.status !== 200) {
      const errMsg = groqResponse.data?.error?.message || "Groq API error";
      console.error("❌ Groq error:", errMsg);
      return res.status(groqResponse.status).json({ error: errMsg });
    }

    const text = groqResponse.data.choices?.[0]?.message?.content || "";
    console.log("✅ Groq response OK, length:", text.length);

    // Return in same format AIInterview.jsx expects
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error("❌ AI proxy error:", err.message);
    res.status(500).json({ error: "AI proxy failed", detail: err.message });
  }
});

module.exports = router;
