import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

dotenv.config();

const app = express();
app.use(express.json());

// === ENV VARIABLES ===
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const PORT = process.env.PORT || 10000;

// === MAIN ROUTE ===
app.get("/", (req, res) => {
  res.send("✅ Converge Auto Poster is running successfully!");
});

// === GEMINI CAPTION GENERATOR ===
async function generateCaption(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Create a short catchy caption for: ${prompt}` }] }],
      }),
    }
  );

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Fast, reliable, and affordable Converge Internet! 🚀"
  );
}

// === FACEBOOK POST FUNCTION ===
async function postToFacebook(message, imageUrl, linkUrl) {
  const url = `https://graph.facebook.com/${FB_PAGE_ID}/photos`;
  const body = new URLSearchParams();
  body.append("url", imageUrl);
  body.append(
    "caption",
    linkUrl ? `${message}\n\nLearn more: ${linkUrl}` : message
  );
  body.append("access_token", FB_ACCESS_TOKEN);

  const response = await fetch(url, { method: "POST", body });
  return response.json();
}

// === FETCH GOOGLE SHEET AND POST ===
async function autoPostFromSheet() {
  try {
    // Replace with your Google Cloud JSON key later if you use a service account
    console.log("⚙️ Reading Google Sheet... (manual key setup needed for full automation)");
  } catch (error) {
    console.error("❌ Error posting from sheet:", error);
  }
}

// === MANUAL POST TEST ROUTE ===
app.post("/post", async (req, res) => {
  const { captionPrompt, photoUrl, linkUrl } = req.body;

  if (!photoUrl) {
    return res.status(400).json({ error: "Photo URL required" });
  }

  const caption = await generateCaption(captionPrompt || "Converge Internet Promo");
  const result = await postToFacebook(caption, photoUrl, linkUrl);

  res.json(result);
});

// === START SERVER ===
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));