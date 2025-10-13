// server.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT || 10000;

const app = express();
app.use(cors());
app.use(express.json());

// Env
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const POST_INTERVAL_HOURS = Number(process.env.POST_INTERVAL_HOURS || 4);
const IMAGE_GENERATION_INTERVAL_HOURS = Number(process.env.IMAGE_GENERATION_INTERVAL_HOURS || 3);
const CTA_LINK = process.env.CTA_LINK || "https://convergepangasinan.github.io/BidaFiberX/";

// Basic health / root
app.get("/", (req, res) => {
  res.send("🚀 Converge Auto Poster running - healthy");
});

// Manual trigger for testing
app.get("/autopost", async (req, res) => {
  try {
    await autoPost();
    res.send("✅ Auto post executed manually!");
  } catch (err) {
    console.error("Manual autopost error:", err);
    res.status(500).send("Autopost failed: " + err.message);
  }
});

//
// -------------------- CORE LOGIC (simple, replace/extend as needed) --------------------
//

// helper: read sheet (public sheets API call using API key) - fallback to environment checks
async function getRandomSheetRow() {
  if (!GOOGLE_SHEET_ID) {
    console.warn("Google sheets id missing");
    return null;
  }
  if (!process.env.GOOGLE_API_KEY) {
    console.warn("Google API key missing - cannot fetch sheet via v4");
    return null;
  }

  try {
    const r = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Post!A:C?key=${process.env.GOOGLE_API_KEY}`
    );
    const rows = r.data.values;
    if (!rows || rows.length < 2) return null;
    const idx = Math.floor(Math.random() * (rows.length - 1)) + 1;
    const [caption = "", imageUrl = "", link = ""] = rows[idx];
    return { caption, imageUrl, link };
  } catch (e) {
    console.error("❌ Error reading Google Sheet:", e.response?.data || e.message);
    return null;
  }
}

// helper: call Gemini (text improvement). Uses API key as query param simplified style.
// You should update to your actual Gemini endpoint/auth if different.
async function enhanceTextWithGemini(text) {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key missing; returning original text");
    return text;
  }
  try {
    const prompt = `Improve this advertisement caption for Converge Fiber page. Randomly use Taglish or English sometimes. Make it persuasive, one or two short paragraphs. Add CTA at the end: ${CTA_LINK}\n\nOriginal:\n${text}`;
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch (err) {
    console.error("⚠️ Gemini failed:", err.response?.data || err.message);
    return text;
  }
}

// helper: generate image with Hugging Face (example using text-to-image model)
async function generateImageWithHugging(prompt) {
  if (!HUGGINGFACE_API_KEY) {
    console.warn("HF token missing — skipping image gen");
    return null;
  }
  try {
    const res = await axios.post(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2", // example
      { inputs: prompt },
      { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` }, responseType: "arraybuffer" }
    );
    // Save to google drive or host somewhere. For now return a data URL:
    const base64 = Buffer.from(res.data, "binary").toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (e) {
    console.error("HF generation error:", e.response?.data || e.message);
    return null;
  }
}

// post to Facebook photos endpoint
async function postToFacebook(caption, imageUrl, link) {
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.warn("FB token missing - cannot post");
    return null;
  }
  try {
    const fullCaption = caption + `\n\nApply here: ${CTA_LINK}`;
    const endpoint = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`;
    const payload = new URLSearchParams();
    payload.append("url", imageUrl);
    payload.append("caption", fullCaption);
    payload.append("access_token", FACEBOOK_ACCESS_TOKEN);
    const resp = await axios.post(endpoint, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    console.log("FB post result:", resp.data);
    return resp.data;
  } catch (e) {
    console.error("❌ Facebook posting failed:", e.response?.data || e.message);
    return null;
  }
}

// main auto-post job
async function autoPost() {
  console.log("⏳ Running auto-post job at", new Date().toISOString());
  const row = await getRandomSheetRow();
  if (!row) {
    console.warn("No sheet row available - skipping");
    return;
  }

  // avoid duplicate: simple placeholder — ideally record posted captions in sheet or DB
  const enhanced = await enhanceTextWithGemini(row.caption || "Amazing Converge Fiber plan!");
  // If image url is empty, maybe generate with HF:
  let imageUrl = row.imageUrl;
  if (!imageUrl) {
    const prompt = `Promotional poster for Converge Fiber: ${enhanced}. bright purple theme, wifi icon, price tag`;
    const dataUrl = await generateImageWithHugging(prompt);
    imageUrl = dataUrl; // data URL works with FB upload? sometimes yes, but FB prefers public URL.
  }

  const resp = await postToFacebook(enhanced, imageUrl, row.link);
  if (resp && resp.post_id) {
    console.log("✅ Posted to Facebook:", resp.post_id);
  } else {
    console.log("❌ Post failed or no post_id returned");
  }
}

// schedule: create both scheduled jobs via setInterval
setInterval(() => {
  // generate (reserve) content every IMAGE_GENERATION_INTERVAL_HOURS hours
  console.log("⏱️ Image/Text generation tick", new Date().toISOString());
  // optional: call generateImageWithHugging() to store, or write to sheet as reserve row
  // For simplicity, we won't call it here (avoid quota). Implement as needed.
}, IMAGE_GENERATION_INTERVAL_HOURS * 60 * 60 * 1000);

// schedule posting
setInterval(() => {
  autoPost().catch(err => console.error("autoPost failed:", err));
}, POST_INTERVAL_HOURS * 60 * 60 * 1000);

// start
app.listen(PORT, () => {
  console.log(`✅ Autopost bot running on port ${PORT}`);
  console.log("⚠️ Google Sheets credentials missing. Set GOOGLE_SHEET_ID and GOOGLE_API_KEY if using Sheets API.");
});