// ===============================================
// 🤖 OpenRouter AI Module - GPT-4o-mini
// Version: v1.0.0
// ===============================================
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Generate captions or text using OpenRouter GPT-4o-mini
 */
export async function generateAIContent(prompt) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a creative assistant for Converge AutoPost Bot." },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return (
      response.data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ No content generated."
    );
  } catch (error) {
    console.error("❌ OpenRouter Error:", error.response?.data || error.message);
    return "⚠️ AI Error (OpenRouter)";
  }
}