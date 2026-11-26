"use strict";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function callGeminiJson({ apiKey, model = DEFAULT_MODEL, prompt }) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: HTTP ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return JSON.parse(text);
}

module.exports = { DEFAULT_MODEL, callGeminiJson };
