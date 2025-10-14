// ===============================================
// 🤖 Gemini AI Service (Final Fixed Version)
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

    // ✅ Use v1 and correct model name
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
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

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      console.log("✅ Gemini Working:", text.slice(0, 100) + "...");
      return text;
    } else {
      console.warn("⚠️ Gemini returned empty response");
      return prompt;
    }
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message || err);
    return prompt;
  }
}