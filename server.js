// ===============================================
// 🚀 Converge Autopost Bot - Server
// Version: v3.2.0
// Updated: Oct 2025
// Author: Edward + Assistant
// Notes: Weekly log cleanup (delete everything in /logs), self-ping, Gemini + Sheets + FB posting.
// ===============================================

import express from "express";
import axios from "axios";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import https from "https";

dotenv.config();

const app = express();
app.use(express.json());

// ---------- Version info ----------
const VERSION = "v3.2.0";
const UPDATED = "Oct 2025";

// ---------- Logs directory ----------
const LOGS_DIR = path.join(process.cwd(), "logs");

// ensure logs folder exists at startup
async function ensureLogsDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error("Could not create logs dir:", err?.message || err);
  }
}
ensureLogsDir();

// ---------- Converge Plan Data (updated) ----------
const CONVERGE_PLANS = [
  // BIDA
  { name: "BIDA Fiber Plan 888", speed: "up to 75 Mbps", price: "₱888/month", features: ["Unlimited Internet", "Up to 8 devices", "Budget-friendly"] },
  { name: "BIDA Fiber Plan 999", speed: "up to 100 Mbps", price: "₱999/month", features: ["Unlimited Internet with Cable", "Up to 8 devices", "Great for streaming"] },

  // Super FiberX
  { name: "Super FiberX Play", speed: "up to 200 Mbps", price: "₱1,349/month", features: ["WiFi 6", "Xperience Hub", "Good for browsing & streaming"] },
  { name: "Super FiberX Max", speed: "up to 400 Mbps", price: "₱1,599/month", features: ["HD streaming & gaming", "WiFi 6 Next Gen Modem"] },
  { name: "Super FiberX Ultra", speed: "up to 800 Mbps", price: "₱2,599/month", features: ["4K streaming", "Powerful for smart homes"] },

  // Netflix bundles
  { name: "Plan 1798 (Netflix Basic)", speed: "up to 400 Mbps", price: "₱1,798/month", features: ["Netflix Basic", "Xperience Hub", "WiFi-6 modem"] },
  { name: "Plan 1998 (Netflix Std)", speed: "up to 500 Mbps", price: "₱1,998/month", features: ["Netflix Standard", "Xperience Hub", "WiFi-6 modem"] },
  { name: "Plan 2298 (Netflix Premium)", speed: "up to 600 Mbps", price: "₱2,298/month", features: ["Netflix Premium", "Xperience Hub", "WiFi-6 modem"] },

  // GameChanger
  { name: "GameChanger 2500", speed: "up to 500 Mbps", price: "₱2,500/month", features: ["Low latency", "Prioritized routing", "For gamers"] },
  { name: "GameChanger 3000", speed: "up to 700 Mbps", price: "₱3,000/month", features: ["Seamless multiplayer", "Smooth streaming"] },
  { name: "GameChanger 5000", speed: "up to 1 Gbps", price: "₱5,000/month", features: ["Top-tier gaming", "Elite speed"] },

  // Time of Day
  { name: "Time of Day - Day Plan", speed: "up to 600 Mbps (day) / 400 Mbps (night)", price: "₱1,699/month", features: ["Faster daytime speed", "Great for work-from-home"] },
  { name: "Time of Day - Night Plan", speed: "up to 400 Mbps (day) / 600 Mbps (night)", price: "₱1,699/month", features: ["Boosted night speed", "Perfect for gamers/night streamers"] }
];

// ---------- Google Sheets Setup ----------
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

// helper to log into local logs file (not necessary but helpful)
async function writeLocalLog(line) {
  try {
    await ensureLogsDir();
    const file = path.join(LOGS_DIR, "out.log");
    const stamp = new Date().toISOString();
    await fs.appendFile(file, `[${stamp}] ${line}\n`);
  } catch (e) {
    console.error("writeLocalLog error:", e?.message || e);
  }
}

// ---------- Gemini content generator (uses Gemini API key param) ----------
async function generateContent(baseText = "Converge Internet", attempt = 1) {
  try {
    const randomLang = Math.random() > 0.5 ? "Taglish" : "English";
    const plan = CONVERGE_PLANS[Math.floor(Math.random() * CONVERGE_PLANS.length)];

    const prompt = `
Create a short, engaging Facebook post in ${randomLang}.
Topic: ${baseText}
Highlight plan: ${plan.name} (${plan.speed}, ${plan.price})
Key features: ${plan.features.join(", ")}.
Add emojis and a friendly conversational tone.
End with: "Apply here 👉 https://convergepangasinan.github.io/BidaFiberX/"
Avoid repeating older content. Keep it natural and unique.
    `;

    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        headers: { "Content-Type": "application/json" },
        params: { key: process.env.GEMINI_API_KEY },
        timeout: 15000
      }
    );

    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content) {
      await writeLocalLog("Generated content via Gemini");
      return content;
    }
    throw new Error("No candidate text returned");
  } catch (err) {
    console.error(`Gemini error (attempt ${attempt}):`, err?.response?.data || err?.message || err);
    if (attempt < 2) {
      await writeLocalLog("Gemini retry");
      return generateContent(baseText, attempt + 1);
    }
    return "Converge Fiber Internet — Fast, reliable, and affordable connection!";
  }
}

// ---------- Save to Google Sheets ----------
async function saveToSheet(content, source = "Gemini") {
  try {
    await doc.useServiceAccountAuth(serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({ Timestamp: new Date().toLocaleString("en-PH"), Source: source, Content: content });
    await writeLocalLog("Saved to Google Sheet");
  } catch (err) {
    console.error("Google Sheets Error:", err?.message || err);
    await writeLocalLog("Failed to save to Google Sheet: " + (err?.message || err));
  }
}

// ---------- Facebook post ----------
async function postToFacebook(content) {
  try {
    const pageId = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;
    const res = await axios.post(`https://graph.facebook.com/${pageId}/feed`, { message: content, access_token: token });
    await writeLocalLog("Posted to Facebook: " + JSON.stringify(res.data).slice(0, 200));
    return res.data;
  } catch (err) {
    console.error("Facebook Post Error:", err?.response?.data || err?.message || err);
    await writeLocalLog("Facebook Post Error: " + (err?.message || JSON.stringify(err?.response?.data || "")));
    return null;
  }
}

// ---------- Main auto-generate & post (2 contents every 3 hours: 1 post + 1 reserve) ----------
async function autoGenerateAndPost() {
  console.log("🕒 Running autoGenerateAndPost...");
  await writeLocalLog("Auto job started");
  for (let i = 0; i < 2; i++) {
    const content = await generateContent();
    await saveToSheet(content, "Gemini");
    if (i === 0) {
      await postToFacebook(content);
    } else {
      console.log("💾 Reserve saved.");
    }
  }
}

// ---------- Draft-only generator (optional) — every 5 minutes saves drafts to sheet ----------
async function autoDraft() {
  try {
    const content = await generateContent("Draft Content Update");
    await saveToSheet(content, "AutoDraft");
    await writeLocalLog("Auto-draft saved");
  } catch (e) {
    console.error("AutoDraft error:", e?.message || e);
  }
}

// ---------- Weekly log cleanup — delete everything inside /logs/ (Sunday 00:00) ----------
async function cleanupLogs() {
  try {
    await writeLocalLog("Log cleanup starting");
    // remove everything inside LOGS_DIR (but not the directory itself)
    const files = await fs.readdir(LOGS_DIR).catch(() => []);
    for (const f of files) {
      const full = path.join(LOGS_DIR, f);
      await fs.rm(full, { recursive: true, force: true }).catch(() => {});
    }
    // create an empty out.log so PM2 has a file to write immediately
    await fs.writeFile(path.join(LOGS_DIR, "out.log"), `Log cleaned at ${new Date().toISOString()}\n`);
    await writeLocalLog("Log cleanup completed");
    console.log("🧹 Log cleanup completed (removed all files in /logs/).");
  } catch (err) {
    console.error("Log cleanup error:", err?.message || err);
  }
}

// ---------- Cron schedules ----------
cron.schedule("0 */3 * * *", autoGenerateAndPost); // every 3 hours
cron.schedule("*/5 * * * *", autoDraft); // every 5 minutes (draft-only)
cron.schedule("*/10 * * * *", async () => { // self-ping every 10 minutes
  try {
    const url = process.env.KEEPALIVE_URL || process.env.RENDER_URL || `https://${process.env.RENDER_SERVICE_DOMAIN || "autopost-bot-m222.onrender.com"}/ping`;
    await axios.get(url);
    await writeLocalLog("Self-ping to " + url);
  } catch (err) {
    console.error("Self-ping failed:", err?.message || err);
  }
});
cron.schedule("0 0 * * 0", cleanupLogs); // every Sunday 00:00

// ---------- Routes ----------
app.get("/", (req, res) => res.send(`🚀 Autopost Bot running - ${VERSION}`));
app.get("/ping", (req, res) => res.send("✅ OK - Server awake"));
app.get("/health", (req, res) => res.send({ status: "healthy", version: VERSION, updated: UPDATED }));
app.get("/version", (req, res) => res.json({ version: VERSION, updated: UPDATED }));

app.get("/test", async (req, res) => {
  const content = await generateContent("Test Converge Ad");
  res.send({ testContent: content });
});

app.get("/manual-post", async (req, res) => {
  const content = await generateContent("Manual post trigger");
  await postToFacebook(content);
  await saveToSheet(content, "Manual");
  res.send("✅ Manual post sent!");
});

// ---------- startup ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (version ${VERSION})`);
});