// ===============================================
// 🚀 Converge Autopost Bot - Main Server
// Version: v3.2.6
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import testBotRouter from "./testAll.js"; // ✅ imported directly (same folder)
import { generateContent } from "./services/gemini.js";     // ✅ gemini service
import { autoPostToFacebook } from "./services/facebook.js"; // ✅ facebook service

dotenv.config();
const app = express();

// ===============================================
// 🔑 Google Sheets Auth
// ===============================================
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

// ===============================================
// 🧠 Core Autopost Function
// ===============================================
async function runAutoPost() {
  try {
    console.log("🕒 Running scheduled autopost...");

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Pending"];
    const rows = await sheet.getRows();

    for (const row of rows) {
      if (row.Status === "Pending") {
        const caption = row.Caption || await generateContent(row.Description);
        const fbResponse = await autoPostToFacebook(caption);

        if (fbResponse.success) {
          row.Status = "✅ Posted";
          row.PostID = fbResponse.postId;
          row.Timestamp = new Date().toLocaleString("en-PH");
          await row.save();
          console.log(`✅ Posted: ${caption}`);
        } else {
          console.error(`❌ Failed to post: ${fbResponse.error}`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error in autopost:", err);
  }
}

// ===============================================
// ⏰ Schedule Every 30 Minutes
// ===============================================
cron.schedule("*/30 * * * *", () => {
  runAutoPost();
});

// ===============================================
// 🧪 Register Test Routes (Sheets + Server)
// ===============================================
app.use("/", testBotRouter); // ✅ mount your /test-bot route

// ===============================================
// 🚀 Start Server
// ===============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));