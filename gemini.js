// ===============================================
// 🤖 Gemini API (2.5 models with fallback & health check)
// ===============================================

import axios from "axios";
import { CONVERGE_PLANS } from "./convergePlans.js";

const MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

/**
 * Try to generate content using one of the models (fallback if first fails).
 * Returns the generated text or throws an error.
 */
export async function generateContent(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const fullPrompt = `Write an engaging Facebook caption for Converge ISP about: ${prompt}.
Include emojis and a short call to action.
Example plan references: ${CONVERGE_PLANS.map(p => p.name).join(", ")}`;

  for (const model of MODELS) {
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
      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (text) {
        console.log(`✅ Gemini Success [${model}]: ${text.substring(0, 80)}...`);
        return text;
      } else {
        console.warn(`⚠️ ${model} returned no text.`);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`⚠️ ${model} failed [${status}]: ${msg}`);
      // continue to next model
    }
  }

  throw new Error("All Gemini 2.5 models failed.");
}

/**
 * Health check for Gemini; logs whether connection is successful.
 */
export async function geminiHealthCheck() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY not set — skipping Gemini health check.");
    return;
  }
  console.log("🧠 Running Gemini health check...");
  try {
    const test = await generateContent("Test connection from AutoPostBot");
    if (test) {
      console.log("✅ Gemini health check passed!");
    } else {
      console.warn("⚠️ Gemini health check returned empty output.");
    }
  } catch (err) {
    console.error("❌ Gemini health check failed:", err.message);
  }
}