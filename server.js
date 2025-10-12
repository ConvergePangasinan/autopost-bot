import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cron from "node-cron";
import { GoogleAuth } from "google-auth-library";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const {
  GEMINI_API_KEY,
  HUGGINGFACE_API_KEY,
  GOOGLE_SHEETS_ID,
  GOOGLE_API_KEY,
  FB_PAGE_ACCESS_TOKEN,
} = process.env;

// Google Sheets Helper
async function getSheetValues(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}?key=${GOOGLE_API_KEY}`;
  const res = await axios.get(url);
  return res.data.values || [];
}

async function updateSheet(range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}?valueInputOption=USER_ENTERED?key=${GOOGLE_API_KEY}`;
  await axios.put(url, { values });
}

async function appendSheet(tab, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${tab}!A1:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;
  await axios.post(url, { values });
}

// --- 1️⃣ Generate captions with Gemini ---
async function generateGeminiCaptions() {
  console.log("🧠 Generating new Converge posts via Gemini...");
  const topics = [
    "Converge FiberX Plans",
    "Converge Bida Plan 888",
    "Converge Bida Plan 999",
    "Converge Super Bundle Plan",
    "Converge WiFi 6 Fiber Plans"
  ];

  const results = [];
  for (const topic of topics) {
    const prompt = `Create a short, engaging Facebook ad (with emojis) about ${topic}. Include features, benefits, and a call to action.`;
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        }
      );
      const caption = res.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (caption) results.push([caption, topic, "https://www.convergeict.com/"]);
    } catch (err) {
      console.error("⚠️ Gemini generation failed:", err.message);
    }
  }

  if (results.length > 0) {
    await appendSheet("Post", results);
    console.log(`✅ Added ${results.length} new posts to Sheet`);
  }
}

// --- 2️⃣ Hugging Face: Generate image from prompt ---
async function generateImage(prompt) {
  try {
    const res = await axios.post(
      "https://api-inference.huggingface.co/models/prompthero/openjourney",
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` }, responseType: "arraybuffer" }
    );
    const imageBase64 = Buffer.from(res.data, "binary").toString("base64");
    return `data:image/png;base64,${imageBase64}`;
  } catch (err) {
    console.error("❌ Hugging Face image generation failed:", err.message);
    return null;
  }
}

// --- 3️⃣ Facebook Posting ---
async function postToFacebook(caption, imageUrl, link) {
  try {
    const fullCaption = link ? `${caption}\n\nLearn more: ${link}` : caption;
    const res = await axios.post(`https://graph.facebook.com/v19.0/me/photos`, {
      url: imageUrl,
      caption: fullCaption,
      access_token: FB_PAGE_ACCESS_TOKEN,
    });
    if (res.data.post_id) {
      console.log("✅ Posted to Facebook:", res.data.post_id);
      await appendSheet("Logs", [[new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }), caption, imageUrl, link, res.data.post_id, "Success"]]);
    }
  } catch (err) {
    console.error("❌ Facebook post failed:", err.response?.data || err.message);
    await appendSheet("Logs", [[new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }), caption, "N/A", "N/A", "Error", err.message]]);
  }
}

// --- 4️⃣ Auto Post Logic ---
async function autoPost() {
  console.log("🚀 Auto posting started...");
  const rows = await getSheetValues("Post!A:C");
  if (rows.length <= 1) return console.log("❌ No data in Post sheet.");

  const randomIndex = Math.floor(Math.random() * (rows.length - 1)) + 1;
  const [caption, prompt, link] = rows[randomIndex];

  const imageUrl = await generateImage(prompt || caption);
  if (imageUrl) await postToFacebook(caption, imageUrl, link);
}

// --- 5️⃣ Cron Schedules ---
cron.schedule("0 0 * * *", generateGeminiCaptions, { timezone: "Asia/Manila" }); // midnight
const postTimes = ["0 6 * * *", "0 10 * * *", "0 14 * * *", "0 18 * * *", "0 22 * * *"];
for (const time of postTimes) cron.schedule(time, autoPost, { timezone: "Asia/Manila" });

// --- Keep Alive Endpoint ---
app.get("/", (req, res) => res.send("🚀 Converge Auto Poster running..."));
app.get("/autopost", async (req, res) => { await autoPost(); res.send("✅ Manual post executed!"); });

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));