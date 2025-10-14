// ===============================================
// 🚀 Converge Autopost Bot - Main Server
// Version: v3.4.0
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import fetch from "node-fetch";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { registerTestRoutes } from "./testAll.js";
import { generateContent, geminiHealthCheck } from "./gemini.js";
import { autoPostToFacebook } from "./facebook.js";
import { VERSION } from "./version.js";

dotenv.config();
const app = express();

// Google Sheets auth
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// Version / status route
app.get("/version", (req, res) => {
  const now = new Date();
  const phTime = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  res.json({
    app: VERSION.app,
    author: VERSION.author,
    version: VERSION.build,
    scripts: VERSION.scripts,
    updated: VERSION.updated,
    environment: process.env.NODE_ENV || "development",
    timestamp: phTime,
  });
});

// Core auto-post function
async function runAutoPost() {
  try {
    console.log("🕒 Running scheduled autopost...");

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle?.["Pending"] || doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (const row of rows) {
      if (row.Status === "Pending" || row.Status === "pending") {
        const caption =
          row.Caption ||
          (await generateContent(row.Description || "Converge Internet"));
        const fbResponse = await autoPostToFacebook(caption);

        if (fbResponse.success) {
          row.Status = "✅ Posted";
          row.PostID = fbResponse.postId;
          row.Timestamp = new Date().toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          });
          await row.save();
          console.log(`✅ Posted: ${caption}`);
        } else {
          console.error("❌ Post failed:", fbResponse.error);
        }
      }
    }
  } catch (err) {
    console.error("❌ runAutoPost error:", err.message);
  }
}

// Schedule auto-post
const intervalHours = Number(process.env.POST_INTERVAL_HOURS || 0);
if (intervalHours > 0) {
  cron.schedule(`0 */${intervalHours} * * *`, runAutoPost);
} else {
  cron.schedule("*/30 * * * *", runAutoPost);
}

// Draft job every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    const content = await generateContent("Draft update");
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      Timestamp: new Date().toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      }),
      Source: "AutoDraft",
      Content: content,
    });
  } catch (err) {
    console.error("Draft error:", err.message);
  }
});

// Weekly logs cleanup
cron.schedule("0 0 * * 0", async () => {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const LOGS_DIR = path.join(process.cwd(), "logs");
    await fs.mkdir(LOGS_DIR, { recursive: true });
    const files = await fs.readdir(LOGS_DIR);
    for (const f of files) {
      await fs.rm(path.join(LOGS_DIR, f), { force: true });
    }
    await fs.writeFile(path.join(LOGS_DIR, "out.log"), `Cleaned: ${new Date().toISOString()}\n`);
    console.log("🧹 Logs cleaned.");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
});

// Register test routes
registerTestRoutes(app, doc, serviceAccountAuth, generateContent);

// Manual post route
app.get("/manual-post", async (req, res) => {
  try {
    const content = await generateContent("Manual post trigger");
    const fb = await autoPostToFacebook(content);
    if (fb.success) {
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      await sheet.addRow({
        Timestamp: new Date().toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        }),
        Source: "Manual",
        Content: content,
      });
      res.send("✅ Manual post sent!");
    } else {
      res.status(500).send(`❌ Manual post failed: ${fb.error}`);
    }
  } catch (err) {
    res.status(500).send(`❌ Manual post error: ${err.message}`);
  }
});

// Root route: status dashboard
app.get("/", async (req, res) => {
  const now = new Date();
  const phTime = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const logs = [];
  logs.push(`🚀 System Status @ ${phTime}`);
  logs.push("----------------------------------------");

  // Gemini
  try {
    await generateContent("Connection test");
    logs.push("✅ Gemini: OK");
  } catch (err) {
    logs.push("⚠️ Gemini Error: " + (err.message || err));
  }

  // Sheets
  try {
    await doc.loadInfo();
    logs.push(`✅ Google Sheets: ${doc.title}`);
  } catch (err) {
    logs.push("⚠️ Sheets Error: " + (err.message || err));
  }

  // Facebook
  try {
    const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
    const json = await r.json();
    if (json.name) logs.push(`✅ Facebook: ${json.name}`);
    else logs.push(`⚠️ Facebook Error: ${JSON.stringify(json)}`);
  } catch (err) {
    logs.push("⚠️ Facebook Error: " + (err.message || err));
  }

  res.send(`
    <h2>✅ Converge AutoPost Bot v3.4.0</h2>
    <p>Status Dashboard (PH): ${phTime}</p>
    <pre>${logs.join("\n")}</pre>
  `);
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Converge Autopost Bot v3.4.0 running on port ${PORT}`);
  geminiHealthCheck(); // run Gemini health check at startup
});