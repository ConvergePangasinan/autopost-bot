// ===============================================
// 🤖 Gemini Content Generator
// Version: v3.3.3 (auto-synced)
// ===============================================

import axios from "axios";
import { VERSION } from "./version.js";
import { CONVERGE_PLANS } from "./convergePlans.js";

export async function generateContent(baseText = "Converge Internet") {
  console.log(`⚙️ [Gemini ${VERSION.scripts.gemini}] Generating content...`);
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key missing!");

    const prompt = `Write an engaging Facebook caption for Converge ISP about: ${baseText}.
Include emojis and a short call to action.
Example plan references: ${CONVERGE_PLANS.map(p => p.name).join(", ")}.`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey } }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Experience ultra-fast Converge Fiber Internet today!";
    console.log(`✅ Gemini output: ${text}`);
    return text;
  } catch (err) {
    console.error("❌ Gemini error:", err.message);
    return baseText;
  }
}