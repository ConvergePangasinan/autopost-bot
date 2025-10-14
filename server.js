// ===============================================
// 🚀 Converge Autopost Bot - Main Server
// Version: v3.4.1 Modular (Server + Scheduler + Logs)
// ===============================================

import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { registerTestRoutes } from "./testAll.js";
import { VERSION } from "./version.js";
import { initScheduler } from "./scheduler.js";
import { registerLogsRoute } from "./logs.js";

dotenv.config();
const app = express();

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
// 🧾 Version Route
// ===============================================
app.get("/version", (req, res) => {
  res.json({
    app: VERSION.app,
    author: VERSION.author,
    version: VERSION.build,
    updated: VERSION.updated,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
  });
});

// ===============================================
// 🧩 Register Modules
// ===============================================
registerTestRoutes(app, doc, serviceAccountAuth, null);
registerLogsRoute(app, doc);
initScheduler(doc);

// ===============================================
// 🚀 Start Server
// ===============================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Converge Autopost Bot v3.4.1 running on port ${PORT}`);
});

// ===============================================
// 🔁 Keep-Alive Ping (Render Free Tier Protection)
// ===============================================
const SELF_URL = process.env.PING_URL || "https://autopost-bot-m222.onrender.com";
const PING_INTERVAL = 10 * 60 * 1000; // every 10 minutes

async function keepAlivePing() {
  const timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  try {
    const res = await fetch(`${SELF_URL}/version`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [${timestamp}] Keep-alive OK — ${data.app} (${data.environment})`);
    } else {
      console.warn(`⚠️ [${timestamp}] Keep-alive HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ [${timestamp}] Keep-alive failed: ${err.message}`);
  }
}
keepAlivePing();
setInterval(keepAlivePing, PING_INTERVAL);