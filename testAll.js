// ===============================================
// 🧪 Test All - Google Sheets & Server Check
// ===============================================

import express from "express";
import { google } from "googleapis";

const router = express.Router();

router.get("/test-bot", async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const sheet = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`✅ Connected to Google Sheets: ${sheet.data.properties.title}`);
    res.send(`✅ BOT TEST PASSED — Connected to ${sheet.data.properties.title}`);
  } catch (err) {
    console.error("❌ BOT TEST FAILED:", err);
    res.status(500).send(`❌ BOT TEST FAILED: ${err.message}`);
  }
});

export default router;