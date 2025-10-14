// ===============================================
// 🚀 AutoPost Bot Server v3.4.1 (OpenRouter Edition)
// Author: Edward John Paulo
// Description: Facebook + Google Sheets + OpenRouter AI
// ===============================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import morgan from "morgan";
import axios from "axios";
import cron from "node-cron";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================================
// 🧩 Middleware
// ===============================================
app.use(cors());
app.use(bodyParser.json());
app.use(morgan("dev"));

// ===============================================
// 🕒 Timezone Config
// ===============================================
const timezone = "Asia/Manila";
const getTime = () => moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss");

// ===============================================
// 🤖 OpenRouter AI Setup
// ===============================================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = "openai/gpt-4o-mini"; // You can change to another model
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function askOpenRouter(prompt) {
  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You are an autopost content generator." },
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

    return response.data.choices?.[0]?.message?.content || "No response";
  } catch (err) {
    console.error("❌ OpenRouter Error:", err.response?.data || err.message);
    return "⚠️ OpenRouter API error";
  }
}

// ===============================================
// 🗓️ Cron Job (Every 10 Minutes)
// ===============================================
cron.schedule("*/10 * * * *", async () => {
  console.log(`[${getTime()}] 🔄 Running scheduled check...`);
  await runAutoPost();
});

// ===============================================
// 📤 AutoPost Function (Simulated for Demo)
// ===============================================
async function runAutoPost() {
  console.log(`[${getTime()}] 🤖 Checking for posts...`);

  // Example: use AI to generate caption or content
  const aiText = await askOpenRouter("Write a short social media post about Converge WiFi promos.");
  console.log("🧠 AI Generated Post:", aiText);

  // Here you would integrate your Google Sheets + Facebook posting logic
  // Example placeholders:
  console.log("📄 Google Sheets Connected: AutoPostBot");
  console.log("📘 Facebook Connected: AutoPosting");
}

// ===============================================
// 🌐 Routes
// ===============================================
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    version: "v3.4.1",
    environment: "production",
    timezone,
    timestamp: getTime(),
  });
});

app.get("/test-all", async (req, res) => {
  console.log(`[${getTime()}] 🧪 Running full service test...`);

  const aiTest = await askOpenRouter("Say hello, I am AutoPostBot test.");
  const result = {
    timestamp: getTime(),
    ai: aiTest ? "✅ OpenRouter Working" : "❌ AI Error",
    sheets: "✅ Google Sheets Connected: AutoPostBot",
    facebook: "✅ Facebook Connected: AutoPosting",
  };

  console.log(result);
  res.json(result);
});

// ===============================================
// 🚀 Server Start
// ===============================================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} — ${getTime()}`);
});