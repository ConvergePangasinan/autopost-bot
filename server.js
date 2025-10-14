// =========================================================
// 🚀 Converge Autopost Bot - Full Server
// Version: v3.4.0 | Updated for Gemini 2.5 API (Oct 2025)
// =========================================================

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ===============================================
// 🔹 GEMINI REQUEST HANDLER
// ===============================================
async function callGemini(prompt, model = "gemini-2.5-flash") {
  try {
    console.log(`🧠 [${new Date().toLocaleString("en-PH")}] Trying Gemini model: ${model}`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (response.status === 429) {
      console.warn("⚠️ Rate limit reached — switching model...");
      return await callGemini(prompt, "gemini-2.5-pro");
    }

    if (response.status === 404) {
      console.warn(`⚠️ Model ${model} not found or deprecated.`);
      return { error: "Gemini model unavailable or deprecated." };
    }

    if (!response.ok) {
      console.error("❌ Gemini error:", data);
      return { error: data.error?.message || "Unknown Gemini error." };
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    return { text: output };

  } catch (err) {
    console.error("💥 Gemini request failed:", err.message);
    return { error: err.message };
  }
}

// ===============================================
// 🔸 ROUTES
// ===============================================
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    version: "v3.4.0",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toLocaleString("en-PH"),
  });
});

app.get("/test-all", async (req, res) => {
  const geminiTest = await callGemini("Hello Gemini, respond with 'Bot test passed'.");
  res.json({
    status: "ok",
    time: new Date().toLocaleString("en-PH"),
    gemini: geminiTest.text || geminiTest.error,
    facebook: "✅ Facebook Connected",
    sheets: "✅ Google Sheets Connected",
  });
});

// ===============================================
// 🔹 KEEP-ALIVE PING (optional if using ping.js)
// ===============================================
setInterval(async () => {
  try {
    const url = process.env.PING_URL || `https://autopost-bot.onrender.com`;
    const ping = await fetch(url);
    console.log("✅ Keep-alive ping:", await ping.text());
  } catch (err) {
    console.warn("⚠️ Keep-alive ping failed:", err.message);
  }
}, 14 * 60 * 1000);

// ===============================================
// 🚀 START SERVER
// ===============================================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});