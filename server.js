// ===============================================
// 🚀 Converge Autopost Bot - Server
// Version: v3.2.3 (Render-ready, fixed Sheets Auth + Gemini endpoint)
// Updated: Oct 2025
// Author: Edward + Assistant
// ===============================================

import express from "express";
import axios from "axios";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { CONVERGE_PLANS } from "./convergePlans.js"; // ✅ imported plans

dotenv.config();

const app = express();
app.use(express.json());

const VERSION = "v3.2.3";
const UPDATED = "Oct 2025";

// ---------- Logs directory ----------
const LOGS_DIR = path.join(process.cwd(), "logs");
await fs.mkdir(LOGS_DIR, { recursive: true }).catch(() => {});

// ---------- Google Sheets Setup ----------
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

// ✅ new v4+ compatible auth setup
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// ---------- Helpers ----------
async function writeLocalLog(line) {
  const file = path.join(LOGS_DIR, "out.log");
  const stamp = new Date().toISOString();
  await fs.appendFile(file, `[${stamp}] ${line}\n`).catch(() => {});
}

// ---------- Gemini content generator ----------
async function generateContent(baseText = "Converge Internet", attempt = 1) {
  try {
    const lang = Math.random() > 0.5 ? "Taglish" : "English";
    const plan = CONVERGE_PLANS[Math.floor(Math.random() * CONVERGE_PLANS.length)];

    const prompt = `
Create a short, engaging Facebook post in ${lang}.
Topic: ${baseText}
Highlight: ${plan.name} (${plan.speed}, ${plan.price})
Features: ${plan.features.join(", ")}.
Add emojis and friendly tone.
End with: "Apply here 👉 https://convergepangasinan.github.io/BidaFiberX/"
Avoid duplicate phrasing.
    `;

    // ✅ updated Gemini API endpoint
    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        headers: { "Content-Type": "application/json" },
        params: { key: process.env.GEMINI_API_KEY },
        timeout: 15000
      }
    );

    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content) return content;
    throw new Error("No candidate text");
  } catch (err) {
    console.error("Gemini error:", err?.response?.data || err?.message);
    if (attempt < 2) return generateContent(baseText, attempt + 1);
    return "Converge Fiber Internet — Fast, reliable, and affordable connection!";
  }
}

// ---------- Save to Google Sheets ----------
async function saveToSheet(content, source = "Gemini") {
  try {
    doc.auth = serviceAccountAuth; // ✅ fixed auth method
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      Timestamp: new Date().toLocaleString("en-PH"),
      Source: source,
      Content: content
    });
  } catch (err) {
    console.error("Sheets Error:", err?.message);
  }
}

// ---------- Facebook Post ----------
async function postToFacebook(content) {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/${process.env.FB_PAGE_ID}/feed`,
      { message: content, access_token: process.env.FB_PAGE_ACCESS_TOKEN }
    );
    await writeLocalLog("FB post success");
    return res.data;
  } catch (err) {
    console.error("FB Post Error:", err?.response?.data || err?.message);
  }
}

// ---------- Main Job ----------
async function autoGenerateAndPost() {
  console.log("🕒 Running autoGenerateAndPost...");
  for (let i = 0; i < 2; i++) {
    const content = await generateContent();
    await saveToSheet(content);
    if (i === 0) await postToFacebook(content);
  }
}

// ---------- Draft Job ----------
async function autoDraft() {
  const content = await generateContent("Draft update");
  await saveToSheet(content, "AutoDraft");
}

// ---------- Log Cleanup ----------
async function cleanupLogs() {
  const files = await fs.readdir(LOGS_DIR).catch(() => []);
  for (const f of files) await fs.rm(path.join(LOGS_DIR, f), { force: true });
  await fs.writeFile(path.join(LOGS_DIR, "out.log"), `Cleaned: ${new Date().toISOString()}\n`);
  console.log("🧹 Logs cleaned.");
}

// ---------- Cron Jobs ----------
cron.schedule("0 */3 * * *", autoGenerateAndPost);
cron.schedule("*/5 * * * *", autoDraft);
cron.schedule("*/10 * * * *", async () => {
  try {
    const url = process.env.KEEPALIVE_URL || `https://${process.env.RENDER_EXTERNAL_URL || "autopost-bot-m222.onrender.com"}/ping`;
    await axios.get(url);
  } catch (err) {
    console.error("Ping fail:", err.message);
  }
});
cron.schedule("0 0 * * 0", cleanupLogs);

// ---------- Routes ----------
app.get("/", (req, res) => res.send(`🚀 Autopost Bot running - ${VERSION}`));
app.get("/ping", (req, res) => res.send("✅ OK - Server awake"));
app.get("/health", (req, res) => res.json({ status: "healthy", version: VERSION, updated: UPDATED }));

// ✅ test route for Gemini output
app.get("/test", async (req, res) => {
  const content = await generateContent("Test Converge Ad");
  res.json({ testContent: content });
});

// ✅ manual post trigger
app.get("/manual-post", async (req, res) => {
  const content = await generateContent("Manual post trigger");
  await postToFacebook(content);
  await saveToSheet(content, "Manual");
  res.send("✅ Manual post sent!");
});

// ✅ NEW: Google Sheets connection test
app.get("/sheet-test", async (req, res) => {
  try {
    doc.auth = serviceAccountAuth;
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      Timestamp: new Date().toLocaleString("en-PH"),
      Source: "Sheet Test",
      Content: "✅ Sheet Test Successful"
    });
    res.send("✅ Google Sheets connected and test row added!");
  } catch (err) {
    console.error("Sheets Test Error:", err.message);
    res.status(500).send(`❌ Sheets Test Failed: ${err.message}`);
  }
});

// 🧪 TEST BOT ROUTE (no autopost.js needed)
import { google } from 'googleapis';

app.get('/test-bot', async (req, res) => {
  try {
    // ✅ Check Google Sheets access
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SHEET_ID; // make sure you set this in Render environment

    const sheet = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`✅ Connected to Google Sheets: ${sheet.data.properties.title}`);

    // ✅ Confirm bot server is active
    console.log('✅ Bot server is running and responding.');

    res.send(`✅ BOT TEST PASSED — Connected to ${sheet.data.properties.title}`);
  } catch (err) {
    console.error('❌ BOT TEST FAILED:', err);
    res.status(500).send(`❌ BOT TEST FAILED: ${err.message}`);
  }
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (${VERSION})`));