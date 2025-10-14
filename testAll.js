// ===============================================
// 🧪 Test Routes (Gemini, Sheets, Facebook)
// Version: v3.3.7 (Enhanced Google Sheets Debug)
// ===============================================

import { google } from "googleapis";
import { autoPostToFacebook } from "./facebook.js";
import { generateContent } from "./gemini.js";
import { VERSION } from "./version.js";

export function registerTestRoutes(app, doc, serviceAccountAuth, generateContentFn) {
  // ===============================================
  // 🩺 Health / Version Route
  // ===============================================
  app.get("/health", (req, res) =>
    res.json({
      status: "healthy",
      version: VERSION.build,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toLocaleString("en-PH"),
    })
  );

  // ===============================================
  // 🧾 Enhanced /test-bot Debug Route
  // Logs missing or malformed credentials clearly
  // ===============================================
  app.get("/test-bot", async (req, res) => {
    try {
      console.log("🔍 [DEBUG] Starting /test-bot check...");

      // Load env vars
      const clientEmail =
        process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
      const sheetId = process.env.GOOGLE_SHEET_ID;

      // Log what’s detected
      console.log("🔧 Environment Check:");
      console.log("GOOGLE_CLIENT_EMAIL:", clientEmail || "❌ MISSING");
      console.log(
        "GOOGLE_PRIVATE_KEY:",
        privateKey
          ? `✅ Loaded (${privateKey.length} chars, starts with: ${privateKey
              .substring(0, 30)
              .replace(/\n/g, "\\n")} ... )`
          : "❌ MISSING or EMPTY"
      );
      console.log("GOOGLE_SHEET_ID:", sheetId || "❌ MISSING");

      // Basic validations
      if (!clientEmail)
        throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_SERVICE_ACCOUNT_EMAIL");
      if (!privateKey) throw new Error("Missing GOOGLE_PRIVATE_KEY");
      if (!sheetId) throw new Error("Missing GOOGLE_SHEET_ID");

      // Reformat private key
      const formattedKey = privateKey.replace(/\\n/g, "\n");

      // Test auth
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: formattedKey },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

      const sheets = google.sheets({ version: "v4", auth });
      const sheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

      console.log(`✅ Connected to Google Sheet: ${sheet.data.properties.title}`);
      res.send(`✅ BOT TEST PASSED — Connected to "${sheet.data.properties.title}"`);
    } catch (err) {
      console.error("❌ BOT TEST FAILED:", err);

      res.status(500).send(`
        ❌ BOT TEST FAILED: ${err.message}
        <br><br>
        <b>Environment Snapshot:</b><br>
        GOOGLE_CLIENT_EMAIL: ${process.env.GOOGLE_CLIENT_EMAIL || "❌ MISSING"}<br>
        GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "❌ MISSING"}<br>
        GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID || "❌ MISSING"}<br>
        PRIVATE_KEY_LENGTH: ${
          process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : "❌ NONE"
        }<br>
        PRIVATE_KEY_FORMAT_OK: ${
          (process.env.GOOGLE_PRIVATE_KEY || "").includes("BEGIN PRIVATE KEY") ? "✅ YES" : "❌ NO"
        }<br>
        NODE_ENV: ${process.env.NODE_ENV || "development"}
      `);
    }
  });

  // ===============================================
  // 🤖 Test Gemini
  // ===============================================
  app.get("/test-gemini", async (req, res) => {
    try {
      const result = await generateContentFn("Say hello from Converge Autopost Bot!");
      res.send(`✅ Gemini Working: ${result}`);
    } catch (err) {
      console.error("❌ Gemini Test Failed:", err);
      res.status(500).send(`❌ Gemini Test Failed: ${err.message}`);
    }
  });

  // ===============================================
  // 📘 Test Facebook (non-posting)
  // ===============================================
  app.get("/test-fb", async (req, res) => {
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();
      res.send(`✅ Connected to Facebook Page: ${json.name || "Unknown Page"}`);
    } catch (err) {
      console.error("❌ Facebook Test Failed:", err);
      res.status(500).send(`❌ Facebook Test Failed: ${err.message}`);
    }
  });
}