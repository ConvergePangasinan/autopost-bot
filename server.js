import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// --- Default route ---
app.get("/", (req, res) => {
  res.send("✅ AutoPost Bot is running smoothly!");
});

// --- Load Google Sheet ---
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

async function accessSheet() {
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
  await doc.loadInfo();
  return doc.sheetsByIndex[0];
}

// --- Gemini content generator (Taglish/English random) ---
async function generateContent() {
  const langs = ["English", "Taglish"];
  const chosen = langs[Math.floor(Math.random() * langs.length)];
  const prompt = `Generate a short ${chosen} Facebook post promoting Converge Internet services. Include emojis and catchy text. Avoid repeating exact phrases. End with “Apply here 👉 https://convergepangasinan.github.io/BidaFiberX/”`;

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated.";
  } catch (err) {
    console.error("Gemini Error:", err);
    return "Error generating content.";
  }
}

// --- Save generated content to Google Sheet ---
async function saveToSheet(content, type = "main") {
  const sheet = await accessSheet();
  await sheet.addRow({
    Timestamp: new Date().toLocaleString(),
    Content: content,
    Type: type
  });
  console.log(`✅ Saved ${type} content to sheet`);
}

// --- CRON: Every 3 hours generate 2 contents ---
cron.schedule("0 */3 * * *", async () => {
  console.log("🕒 Generating new content batch...");
  const mainContent = await generateContent();
  const reserveContent = await generateContent();

  await saveToSheet(mainContent, "main");
  await saveToSheet(reserveContent, "reserve");
});

// --- Self ping every 10 minutes to prevent sleep ---
cron.schedule("*/10 * * * *", async () => {
  try {
    const url = process.env.RENDER_URL || "https://autopost-bot-m222.onrender.com";
    await fetch(url);
    console.log("🔁 Self-ping successful");
  } catch (err) {
    console.error("Ping failed:", err);
  }
});

// --- Start server ---
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));