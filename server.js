// ===============================
//  🤖 AutoPost Server - Gemini + Facebook
// ===============================

import express from "express";
import schedule from "node-schedule";
import axios from "axios";
import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// --- Load environment variables ---
const {
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GEMINI_API_KEY,
  HUGGINGFACE_API_KEY,
  FACEBOOK_PAGE_ID,
  FACEBOOK_ACCESS_TOKEN,
  CONTENT_GENERATION_TIME,
  SCHEDULED_TIMES,
  ENABLE_LOGS
} = process.env;

// --- Logger helper ---
function log(msg) {
  if (ENABLE_LOGS === "true") console.log(`[${new Date().toLocaleString()}] ${msg}`);
}

// ===============================
//  🔗 GOOGLE SHEETS SETUP
// ===============================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// --- Append a new row to the sheet ---
async function appendToSheet(rowData) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A:D",
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
    log("✅ Data added to Google Sheet.");
  } catch (err) {
    console.error("❌ Error appending to Google Sheet:", err);
  }
}

// ===============================
//  🤖 GEMINI - TEXT GENERATION
// ===============================
async function generateDailyContent() {
  try {
    log("🧠 Generating daily content via Gemini...");

    const topics = [
      "Tech news",
      "AI trends",
      "Programming tips",
      "Cybersecurity insights",
      "Motivational quote"
    ];

    const results = [];

    for (const topic of topics) {
      const prompt = `Generate a short, engaging Facebook post about ${topic}. Include emojis if appropriate.`;
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] }
      );

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
      results.push({ topic, text });
      await appendToSheet([new Date().toISOString(), topic, text, "pending"]);
    }

    log("✅ Gemini content generation completed and saved to Google Sheet.");
  } catch (error) {
    console.error("❌ Gemini content generation failed:", error);
  }
}

// ===============================
//  🖼️ IMAGE GENERATION (Hugging Face)
// ===============================
async function generateImage(prompt) {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/ZB-Tech/Text-to-Image",
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` }, responseType: "arraybuffer" }
    );

    const imagePath = `./images/${Date.now()}.png`;
    fs.writeFileSync(imagePath, Buffer.from(response.data));
    log("🖼️ Image generated successfully!");
    return imagePath;
  } catch (error) {
    console.error("❌ Error generating image:", error);
    return null;
  }
}

// ===============================
//  📘 FACEBOOK POSTING
// ===============================
async function postToFacebook(message, imagePath = null) {
  try {
    let mediaId = null;

    if (imagePath) {
      const formData = new FormData();
      formData.append("access_token", FACEBOOK_ACCESS_TOKEN);
      formData.append("source", fs.createReadStream(imagePath));

      const uploadRes = await axios.post(
        `https://graph.facebook.com/${FACEBOOK_PAGE_ID}/photos`,
        formData,
        { headers: formData.getHeaders() }
      );

      mediaId = uploadRes.data.id;
    }

    const postRes = await axios.post(
      `https://graph.facebook.com/${FACEBOOK_PAGE_ID}/feed`,
      {
        message,
        access_token: FACEBOOK_ACCESS_TOKEN,
        ...(mediaId ? { attached_media: [{ media_fbid: mediaId }] } : {}),
      }
    );

    log(`📢 Posted to Facebook: ${postRes.data.id}`);
  } catch (error) {
    console.error("❌ Facebook posting error:", error.response?.data || error);
  }
}

// ===============================
//  🕓 SCHEDULING
// ===============================

// --- Daily Gemini content generation ---
const generationTime = CONTENT_GENERATION_TIME || "03:00";
schedule.scheduleJob(generationTime, async () => {
  log(`🧠 Running daily Gemini content generation at ${generationTime}`);
  await generateDailyContent();
});

// --- Posting schedule ---
const times = (SCHEDULED_TIMES || "06:00,10:00,14:00,18:00,22:00").split(",");

for (const t of times) {
  schedule.scheduleJob(t, async () => {
    log(`🕒 Posting scheduled content at ${t}`);
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Sheet1!A:D",
      });

      const rows = res.data.values || [];
      const nextPost = rows.find((r) => r[3] === "pending");
      if (!nextPost) {
        log("⚠️ No pending content found.");
        return;
      }

      const [timestamp, topic, text] = nextPost;
      const image = await generateImage(topic);
      await postToFacebook(text, image);

      // Mark as posted
      const rowIndex = rows.indexOf(nextPost) + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Sheet1!D${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [["posted"]] },
      });

      log(`✅ Posted: "${topic}"`);
    } catch (err) {
      console.error("❌ Posting schedule failed:", err);
    }
  });
}

// ===============================
//  🚀 EXPRESS SERVER
// ===============================
app.get("/", (req, res) => {
  res.send("✅ AutoPost Server is running successfully!");
});

app.listen(PORT, () => log(`🚀 Server running on port ${PORT}`));