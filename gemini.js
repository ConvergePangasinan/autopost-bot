// ===============================================
// 🤖 Gemini AI Service (Fixed API Endpoint)
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

    // ✅ Updated endpoint (v1beta, stable)
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    console.log("🌐 Gemini Request URL:", url);

    const response = await axios.post(
      url,
      { contents: [{ parts: [{ text: fullPrompt }] }] },
      { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey } }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message);
    return prompt;
  }
}