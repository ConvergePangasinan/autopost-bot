// ===============================================
// 🤖 Gemini AI Service (Google Free API)
// Version: v3.3.9 (Gemini 2.5 Flash)
// ===============================================

import axios from "axios";
import { CONVERGE_PLANS } from "./convergePlans.js";

export async function generateContent(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // Build a smarter, complete prompt
    const fullPrompt = `
Generate a short, creative, and engaging Facebook caption for Converge Internet.
Topic: ${prompt}.
Use emojis and a brief call-to-action.
Include plan highlights like: ${CONVERGE_PLANS.map(p => p.name).join(", ")}.
`;

    // ✅ Correct and latest Gemini 2.5 Flash model endpoint (Free Tier)
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    console.log("🌐 Gemini Request →", url);

    const response = await axios.post(
      url,
      { contents: [{ parts: [{ text: fullPrompt }] }] },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        timeout: 20000, // 20s timeout
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Converge — Fast, reliable internet for every Filipino home! ⚡📶";

    console.log("✅ Gemini Response OK");
    return text;
  } catch (err) {
    const errorMsg =
      err.response?.data?.error?.message || err.message || "Unknown Gemini API error";
    console.error("❌ Gemini Error:", errorMsg);

    // Fallback default caption
    return "Converge Internet — Fast, reliable, and affordable plans for your home! 🚀📶 #ConvergeFiber";
  }
}