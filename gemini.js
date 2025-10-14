// ===============================================
// 🤖 Gemini AI Service (Fixed for 404 error)
// Version: v3.3.7
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

    // ✅ Correct endpoint and model
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
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
      console.log("✅ Gemini Working:", text.slice(0, 80) + "...");
      return text;
    } else {
      console.log("⚠️ Gemini returned no text.");
      return prompt;
    }
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message || err);
    return prompt;
  }
}