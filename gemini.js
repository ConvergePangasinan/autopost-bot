// ===============================================
// 🤖 Gemini AI Service (Stable + Auto-Fallback + Health Test)
// Version: v3.4.0
// ===============================================

import axios from "axios";
import { CONVERGE_PLANS } from "./convergePlans.js";

const models = ["gemini-1.5-flash", "gemini-1.5-pro"];

export async function generateContent(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const fullPrompt = `Write an engaging Facebook caption for Converge ISP about: ${prompt}.
Include emojis and a short call to action.
Example plan references: ${CONVERGE_PLANS.map((p) => p.name).join(", ")}`;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
      console.log(`🌐 Trying Gemini model: ${model}`);

      try {
        const response = await axios.post(
          url,
          { contents: [{ parts: [{ text: fullPrompt }] }] },
          {
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
          }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log(`✅ Gemini Success [${model}]: ${text.substring(0, 80)}...`);
          return text;
        }
      } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.warn(`⚠️ ${model} failed [${status || "No Status"}]: ${msg}`);
      }
    }

    throw new Error("All Gemini models failed.");
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message);
    return prompt;
  }
}

// ===============================================
// 🧪 Startup Health Check
// ===============================================
export async function geminiHealthCheck() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY missing — skipping health check.");
    return;
  }

  console.log("🧠 Running Gemini API health check...");
  try {
    const test = await generateContent("Test connection from AutoPostBot health check");
    if (test) {
      console.log("✅ Gemini API health check passed!");
    } else {
      console.warn("⚠️ Gemini health check returned empty response.");
    }
  } catch (err) {
    console.error("❌ Gemini health check failed:", err.message);
  }
}