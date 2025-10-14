// ===============================================
// 🚀 Converge AutoPost Bot - Main Server
// Version: v3.4.0 (OpenRouter + Keep-Alive 10min)
// ===============================================
import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import fetch from "node-fetch";
import morgan from "morgan";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { registerTestRoutes } from "./testAll.js";
import { generateAIContent } from "./openRouter.js";

dotenv.config();
const app = express();
app.use(morgan("dev"));

// ===============================================
// 🔑 Google Sheets Auth
// ===============================================
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// ===============================================
// 🧾 Version & Health Route
// ===============================================
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    version: "v3.4.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
  });
});

// ===============================================
// 🧠 Core AutoPost Function
// ===============================================
async function runAutoPost() {
  try {
    console.log("🕒 Running scheduled autopost...");
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Pending"] || doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (const row of rows) {
      if (row.Status === "Pending" || row.Status === "pending") {
        const caption =
          row.Caption || (await generateAIContent(row.Description || "Converge Internet Plans"));
        console.log("📝 Generated Caption:", caption);

        // Simulate post success
        row.Status = "✅ Posted";
        row.Timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
        await row.save();
      }
    }
  } catch (err) {
    console.error("❌ Error in autopost:", err.message);
  }
}

// Schedule every 30 mins (default)
cron.schedule("*/30 * * * *", runAutoPost);

// ===============================================
// 🧪 Register Test Route
// ===============================================
registerTestRoutes(app, doc, serviceAccountAuth, generateAIContent);

// ===============================================
// 🚀 Start Server
// ===============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Converge Autopost Bot v3.4.0 running on port ${PORT}`);
});

// ===============================================
// 🔁 Keep-Alive Ping (Every 10 Minutes)
// ===============================================
const SELF_URL = process.env.PING_URL || "https://autopost-bot.onrender.com";
const PING_INTERVAL = 10 * 60 * 1000;

async function keepAlivePing() {
  const timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  try {
    const res = await fetch(`${SELF_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [${timestamp}] Keep-alive OK — ${data.status}`);
    } else {
      console.warn(`⚠️ [${timestamp}] Keep-alive HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ [${timestamp}] Keep-alive failed: ${err.message}`);
  }
}
keepAlivePing();
setInterval(keepAlivePing, PING_INTERVAL);