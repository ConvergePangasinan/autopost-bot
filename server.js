// server.js
import express from "express";
import axios from "axios";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// --- Google Sheets Setup ---
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// --- Utility: Generate random Taglish or English tone ---
const randomTone = () => (Math.random() > 0.5 ? "Taglish" : "English");

// --- Content Generation Function ---
async function generateContent() {
  const tone = randomTone();
  const prompt = `Create a short engaging Facebook post caption about Converge Fiber Internet in ${tone}. 
  Make sure it's catchy, unique, not repetitive, and ends with a call to action:
  "Apply here 👉 https://convergepangasinan.github.io/BidaFiberX/"`;

  let content = "";
  try {
    // --- Try Gemini first ---
    const geminiRes = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    content = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.log("Gemini error, fallback to HuggingFace.");
  }

  // --- Fallback to HuggingFace ---
  if (!content) {
    try {
      const hfRes = await axios.post(
        "https://api-inference.huggingface.co/models/gpt2",
        { inputs: prompt },
        { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
      );
      content = hfRes.data[0]?.generated_text || "";
    } catch (err) {
      console.log("HuggingFace error:", err.message);
    }
  }

  return content.trim();
}

// --- Write Content to Google Sheets ---
async function saveContentToSheet(content, type) {
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRow({
    Timestamp: new Date().toLocaleString(),
    Type: type,
    Content: content,
  });
  console.log(`✅ Saved ${type} content to sheet`);
}

// --- Auto Generate Content every 3 hours ---
cron.schedule("0 */3 * * *", async () => {
  console.log("🕒 Generating new contents...");
  const postContent = await generateContent();
  const reserveContent = await generateContent();

  if (postContent) await saveContentToSheet(postContent, "Post");
  if (reserveContent) await saveContentToSheet(reserveContent, "Reserve");
});

// --- Auto Ping Route (every 10 mins) ---
cron.schedule("*/10 * * * *", async () => {
  try {
    await axios.get("https://autopost-bot-m222.onrender.com/health");
    console.log("✅ Pinged self to stay awake");
  } catch (err) {
    console.log("Ping error:", err.message);
  }
});

// --- Health Route for Monitoring ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Root Route for Render Preview ---
app.get("/", (req, res) => {
  res.send("🚀 AutoPost Bot Server is running successfully!");
});

// --- Manual Test Route to Trigger Generation ---
app.get("/test-generate", async (req, res) => {
  try {
    const testContent = await generateContent();
    await saveContentToSheet(testContent, "Test");
    res.json({ message: "✅ Test content generated and saved!", content: testContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Server Listen ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));