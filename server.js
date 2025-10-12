import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

// --- Function to fetch a random post from Google Sheets ---
async function getRandomSheetRow() {
  try {
    const res = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/Sheet1!A:C?key=${process.env.GOOGLE_API_KEY}`
    );

    const rows = res.data.values;
    if (!rows || rows.length < 2) return null;

    const randomIndex = Math.floor(Math.random() * (rows.length - 1)) + 1;
    const [caption, imageUrl, link] = rows[randomIndex];
    return { caption, imageUrl, link };
  } catch (err) {
    console.error("❌ Error reading Google Sheet:", err.message);
    return null;
  }
}

// --- Function to enhance text using Gemini AI ---
async function enhanceTextWithGemini(text) {
  try {
    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [{ text: `Improve this advertisement text professionally:\n\n${text}` }],
          },
        ],
      }
    );
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || text;
  } catch (err) {
    console.error("⚠️ Gemini enhancement failed:", err.message);
    return text;
  }
}

// --- Function to post to Facebook ---
async function postToFacebook(caption, imageUrl, link) {
  try {
    const fullCaption = link ? `${caption}\n\nLearn more: ${link}` : caption;

    const res = await axios.post(
      `https://graph.facebook.com/v19.0/me/photos`,
      {
        url: imageUrl,
        caption: fullCaption,
        access_token: FB_PAGE_ACCESS_TOKEN,
      }
    );

    if (res.data.post_id) {
      console.log("✅ Successfully posted to Facebook:", res.data.post_id);
    } else {
      console.log("⚠️ Post result:", res.data);
    }
  } catch (err) {
    console.error("❌ Facebook posting failed:", err.response?.data || err.message);
  }
}

// --- Auto posting logic ---
async function autoPost() {
  console.log("⏳ Running auto-post...");
  const row = await getRandomSheetRow();
  if (!row) return console.log("❌ No data from sheet.");

  const enhancedText = await enhanceTextWithGemini(row.caption);
  await postToFacebook(enhancedText, row.imageUrl, row.link);
}

// --- Manual trigger ---
app.get("/autopost", async (req, res) => {
  await autoPost();
  res.send("✅ Auto post executed manually!");
});

// --- Schedule every 4 hours ---
setInterval(autoPost, 4 * 60 * 60 * 1000);

// --- Keep alive endpoint ---
app.get("/", (req, res) => res.send("🚀 Converge Auto Poster running..."));

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));