// ===============================================
// 🤖 Gemini AI Service (Root Version)
// File: gemini.js
// Supports: gemini-2.5-flash (Free Tier) + Fallback
// ===============================================

import axios from "axios";

export async function generateContent(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("❌ Missing GEMINI_API_KEY in .env");

    // ✅ Use latest models first, fallback to legacy if needed
    const models = [
      "gemini-2.5-flash",     // Free tier main model
      "gemini-1.5-flash-002"  // Legacy fallback (still working)
    ];

    // 🕒 PH timezone
    const now = new Date();
    const localTime = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });

    const fullPrompt = `
Write a creative Facebook caption for Converge ISP about: ${prompt}.
Include emojis, a short call to action, and keep it engaging.
`;

    for (const model of models) {
      try {
        console.log(`🕒 [${localTime}] Trying Gemini model: ${model}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await axios.post(
          url,
          {
            contents: [
              {
                parts: [{ text: fullPrompt }]
              }
            ]
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            }
          }
        );

        const text =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (text.trim()) {
          console.log(`✅ Gemini response success (${model})`);
          return text;
        } else {
          console.warn(`⚠️ ${model} returned empty response.`);
        }
      } catch (err) {
        const code = err.response?.status || "UNKNOWN";
        const msg = err.response?.data?.error?.message || err.message;
        console.warn(`⚠️ ${model} failed [${code}]: ${msg}`);

        // Handle rate-limit fallback
        if (code === 429) {
          console.log("🔄 Rate limit reached — switching model...");
          continue;
        }
      }
    }

    return "⚠️ Gemini temporarily unavailable. Please try again later.";
  } catch (err) {
    console.error("❌ Critical Gemini error:", err.message);
    return "⚠️ Gemini initialization failed.";
  }
}