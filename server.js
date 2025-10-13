// ===============================================
// 🚀 Converge Autopost Bot - Server
// Version: v3.2.1 (Render-ready)
// Updated: Oct 2025
// Author: Edward + Assistant
// Notes: Self-ping, Gemini + Sheets + FB posting, weekly log cleanup.
// ===============================================

import express from "express";
import axios from "axios";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());

const VERSION = "v3.2.1";
const UPDATED = "Oct 2025";

// ---------- Logs directory ----------
const LOGS_DIR = path.join(process.cwd(), "logs");
await fs.mkdir(LOGS_DIR, { recursive: true }).catch(() => {});

// ---------- Converge Plans ----------
const CONVERGE_PLANS = [
  // BIDA
  { name: "BIDA Fiber Plan 888", speed: "up to 75 Mbps", price: "₱888/month", features: ["Unlimited Internet", "Up to 8 devices", "Budget-friendly"] },
  { name: "BIDA Fiber Plan 999", speed: "up to 100 Mbps", price: "₱999/month", features: ["Unlimited Internet with Cable", "Up to 8 devices", "Great for streaming"] },

  // Super FiberX
  { name: "Super FiberX Play", speed: "up to 200 Mbps", price: "₱1,349/month", features: ["WiFi 6", "Xperience Hub", "Good for browsing & streaming"] },
  { name: "Super FiberX Max", speed: "up to 400 Mbps", price: "₱1,599/month", features: ["HD streaming & gaming", "WiFi 6 Next Gen Modem"] },
  { name: "Super FiberX Ultra", speed: "up to 800 Mbps", price: "₱2,599/month", features: ["4K streaming", "Powerful for smart homes"] },

  // Netflix Bundles
  { name: "Plan 1798 (Netflix Basic)", speed: "up to 400 Mbps", price: "₱1,798/month", features: ["Netflix Basic", "Xperience Hub", "WiFi-6 modem"] },
  { name: "Plan 1998 (Netflix Standard)", speed: "up to 500 Mbps", price: "₱1,998/month", features: ["Netflix Standard", "Xperience Hub", "WiFi-6 modem"] },
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
    await doc.useServiceAccountAuth(serviceAccountAuth);
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

app.get("/test", async (req, res) => {
  const content = await generateContent("Test Converge Ad");
  res.json({ testContent: content });
});

app.get("/manual-post", async (req, res) => {
  const content = await generateContent("Manual post trigger");
  await postToFacebook(content);
  await saveToSheet(content, "Manual");
  res.send("✅ Manual post sent!");
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (${VERSION})`));