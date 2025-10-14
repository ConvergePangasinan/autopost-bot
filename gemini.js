// ===============================================
// 🤖 Gemini AI Service
// Version: v3.3.7 (fixed endpoint)
// ===============================================

import axios from "axios";
import { CONVERGE_PLANS } from "./convergePlans.js";

export async function generateContent(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const fullPrompt = `Write an engaging Facebook caption for Converge ISP about: ${prompt}.
Include emojis and a short call to action.
Example plan references: ${CONVERGE_PLANS.map(p => p.name).join(", ")}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;

    const response = await axios.post(
      `${url}?key=${apiKey}`,
      { contents: [{ parts: [{ text: fullPrompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) throw new Error("No response text from Gemini");

    return text;
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message || err);
    return `⚠️ Gemini Error: ${err.message || "Unknown"}`;
  }
}