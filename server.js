import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();
const app = express();
app.use(express.json());

// =============================
// 🔹 CONFIG
// =============================
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// =============================
// 🔹 HELPER FUNCTIONS
// =============================

// Fetch captions & image links from Google Sheet
async function getSheetData() {
  const sheets = google.sheets({ version: "v4" });
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Sheet1!A2:C",
    auth: client,
  });

  const rows = res.data.values || [];
  return rows.map((row) => ({
    caption: row[0] || "",
    image: row[1] || "",
    link: row[2] || "",
  }));
}

// Generate AI caption with Gemini
async function generateCaption(baseText) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Make this ad post more engaging for social media:\n\n${baseText}` },
              ],
            },
          ],
        }),
      }
    );
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || baseText;
  } catch (err) {
    console.error("Gemini error:", err);
    return baseText;
  }
}

// Post to Facebook
async function postToFacebook(caption, imageUrl, linkUrl) {
  const postUrl = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`;
  const formData = new URLSearchParams();
  formData.append("url", imageUrl);
  formData.append(
    "caption",
    linkUrl ? `${caption}\n\nLearn more: ${linkUrl}` : caption
  );
  formData.append("access_token", FACEBOOK_ACCESS_TOKEN);

  const response = await fetch(postUrl, {
    method: "POST",
    body: formData,
  });

  return await response.json();
}

// =============================
// 🔹 ROUTES
// =============================

// Health check
app.get("/", (req, res) => {
  res.send("✅ Facebook Auto Poster is running!");
});

// Manual trigger to post ads
app.get("/autopost", async (req, res) => {
  try {
    const rows = await getSheetData();
    if (rows.length === 0) return res.json({ error: "No data found in Sheet." });

    const { caption, image, link } = rows[Math.floor(Math.random() * rows.length)];
    const aiCaption = await generateCaption(caption);
    const result = await postToFacebook(aiCaption, image, link);

    res.json({ message: "Posted successfully!", post: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));