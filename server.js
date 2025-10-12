// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

dotenv.config();
const app = express();
app.use(express.json());

// --- CONFIG ---
const PORT = process.env.PORT || 3000;
const PAGE_ID = process.env.FB_PAGE_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// --- GOOGLE SHEETS SETUP ---
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const serviceAccountAuth = new JWT({
  email: serviceAccountEmail,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

// --- GEMINI POST CAPTION CREATOR ---
async function generateCaption(prompt) {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Default post caption.";
  } catch (err) {
    console.error("Gemini Error:", err);
    return "Error generating caption.";
  }
}

// --- FACEBOOK POST FUNCTION ---
async function postToFacebook(message, imageUrl) {
  const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos`;
  const formData = new URLSearchParams();
  formData.append("url", imageUrl);
  formData.append("caption", message);
  formData.append("access_token", ACCESS_TOKEN);

  const res = await fetch(url, { method: "POST", body: formData });
  return await res.json();
}

// --- MAIN AUTO POST ---
app.get("/autopost", async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const row = rows[Math.floor(Math.random() * rows.length)];

    const prompt = `Write a short, catchy social media caption about: ${row.topic || "Converge internet"}`;
    const caption = await generateCaption(prompt);
    const imageUrl = row.image || "https://placehold.co/600x400";

    const fbResponse = await postToFacebook(caption, imageUrl);

    res.json({
      status: "✅ Posted successfully",
      caption,
      imageUrl,
      fbResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROOT ROUTE ---
app.get("/", (req, res) => {
  res.send("🚀 Auto Poster Bot is running on Render!");
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));