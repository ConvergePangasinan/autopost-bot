import express from "express";
import axios from "axios";
import cron from "node-cron";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// Load env variables
import dotenv from "dotenv";
dotenv.config();

// ===== CONFIG =====
const { FB_PAGE_ID, FB_ACCESS_TOKEN, GEMINI_API_KEY, SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

// ====== GOOGLE SHEETS SETUP ======
const auth = new google.auth.JWT(
  GOOGLE_SERVICE_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets"]
);
const sheets = google.sheets({ version: "v4", auth });

// ====== GEMINI TEXT GENERATION ======
async function generateCaption(prompt) {
  const res = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY,
    { contents: [{ parts: [{ text: prompt }] }] }
  );
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Auto caption failed";
}

// ====== FACEBOOK POST FUNCTION ======
async function postToFacebook(message, imageUrl) {
  const url = `https://graph.facebook.com/v20.0/${FB_PAGE_ID}/photos`;
  const formData = new URLSearchParams();
  formData.append("caption", message);
  formData.append("url", imageUrl);
  formData.append("access_token", FB_ACCESS_TOKEN);
  const res = await axios.post(url, formData);
  return res.data;
}

// ====== MAIN POST JOB ======
async function runAutoPost() {
  try {
    const rows = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Posts!A2:C"
    });

    const [captionPrompt, imageUrl, link] = rows.data.values[0]; // first row
    const caption = await generateCaption(`${captionPrompt}\nInclude link: ${link}`);

    const fbRes = await postToFacebook(caption, imageUrl);

    // Log success
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Logs!A:C",
      valueInputOption: "RAW",
      requestBody: { values: [[new Date().toISOString(), caption, fbRes.post_id]] }
    });

    console.log("✅ Posted:", fbRes.post_id);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

// ====== CRON JOB (every 6 hours) ======
cron.schedule("0 */6 * * *", runAutoPost);

// ====== KEEP-ALIVE PING ======
app.get("/", (req, res) => res.send("✅ Auto Poster Running..."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server live on port", PORT));