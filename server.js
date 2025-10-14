// ===============================================
// 🚀 Converge Autopost Bot - Main Server
// Version: v3.4.0 (Manual Sheet Mode + Keep-Alive 10min)
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import fetch from "node-fetch";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { autoPostToFacebook } from "./facebook.js";
import { registerTestRoutes } from "./testAll.js";
import { VERSION } from "./version.js";

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
// 🧠 Core AutoPost (Manual Sheet Mode)
// ===============================================
async function runAutoPost() {
  try {
    console.log("🕒 Running scheduled autopost...");
    await doc.loadInfo();

    const sheet =
      doc.sheetsByTitle && doc.sheetsByTitle["Pending"]
        ? doc.sheetsByTitle["Pending"]
        : doc.sheetsByIndex[0];

    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.Status === "Pending" || row.Status === "pending") {
        const caption = row.Caption || row.Description || "Converge Internet Post";
        const fbResponse = await autoPostToFacebook(caption);

        if (fbResponse.success) {
          row.Status = "✅ Posted";
          row.PostID = fbResponse.postId;
          row.Timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
          await row.save();
          console.log(`✅ Posted: ${caption}`);
        } else {
          console.error(`❌ Failed to post: ${fbResponse.error}`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error in autopost:", err);
  }
}

// ===============================================
// ⏰ Schedule AutoPost
// ===============================================
const intervalHours = Number(process.env.POST_INTERVAL_HOURS || 0);
if (intervalHours > 0) {
  cron.schedule(`0 */${intervalHours} * * *`, runAutoPost);
} else {
  cron.schedule("*/30 * * * *", runAutoPost); // every 30 minutes default
}

// ===============================================
// 🧪 Register Test Routes (Sheets + Facebook)
// ===============================================
registerTestRoutes(app, doc, serviceAccountAuth);

// ===============================================
// 🧩 Root Route — Live Status
// ===============================================
app.get("/", async (req, res) => {
  const logs = [];
  logs.push("🚀 Full System Status Check");

  try {
    await doc.loadInfo();
    logs.push(`✅ Google Sheets: ${doc.title}`);
  } catch (e) {
    logs.push("⚠️ Sheets Error: " + (e.message || e));
  }

  try {
    const pageId = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;
    const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
    const json = await r.json();
    if (json.name) logs.push(`✅ Facebook: ${json.name}`);
    else logs.push(`⚠️ Facebook Error: ${JSON.stringify(json)}`);
  } catch (e) {
    logs.push("⚠️ Facebook Error: " + (e.message || e));
  }

  res.send(`
    <h2>✅ Converge AutoPost Bot v3.4.0</h2>
    <p>Status Dashboard (${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })})</p>
    <pre>${logs.join("\n")}</pre>
  `);
});

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
    const res = await fetch(SELF_URL);
    if (res.ok) console.log(`✅ [${timestamp}] Keep-alive OK`);
    else console.warn(`⚠️ [${timestamp}] HTTP ${res.status}`);
  } catch (err) {
    console.error(`❌ [${timestamp}] Keep-alive failed: ${err.message}`);
  }
}
keepAlivePing();
setInterval(keepAlivePing, PING_INTERVAL);