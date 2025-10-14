// ===============================================
// 🧪 Test Routes (Gemini, Sheets, Facebook)
// Version: v3.3.6
// ===============================================

import { google } from "googleapis";
import { autoPostToFacebook } from "./facebook.js";
import { generateContent } from "./gemini.js";
import { VERSION } from "./version.js";

export function registerTestRoutes(app, doc, serviceAccountAuth, generateContentFn) {
  // Health / version check
  app.get("/health", (req, res) => res.json({ status: "healthy", version: VERSION.build }));

  // Test Google Sheets connection
  app.get("/test-bot", async (req, res) => {
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

      res.send(`✅ BOT TEST PASSED — Connected to ${sheet.data.properties.title}`);
    } catch (err) {
      console.error("❌ BOT TEST FAILED:", err);
      res.status(500).send(`❌ BOT TEST FAILED: ${err.message}`);
    }
  });

  // Test Gemini
  app.get("/test-gemini", async (req, res) => {
    try {
      const result = await generateContentFn("Say hello from Converge Autopost Bot!");
      res.send(`✅ Gemini Working: ${result}`);
    } catch (err) {
      res.status(500).send(`❌ Gemini Test Failed: ${err.message}`);
    }
  });

  // Test Facebook (does not post; just checks page info)
  app.get("/test-fb", async (req, res) => {
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();
      res.send(`✅ Connected to Facebook Page: ${json.name || "Unknown Page"}`);
    } catch (err) {
      res.status(500).send(`❌ Facebook Test Failed: ${err.message}`);
    }
  });
}
