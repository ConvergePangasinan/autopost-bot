// ===============================================
// 🧪 Test Routes (Gemini, Sheets, Facebook, All)
// Version: v3.4.0
// ===============================================

import { google } from "googleapis";

// ===============================================
// 🧩 REGISTER TEST ROUTES
// ===============================================
export function registerTestRoutes(app, doc, serviceAccountAuth, generateContentFn) {
  // 🩺 Health / Version Route
  app.get("/health", (req, res) => {
    const now = new Date();
    const phTime = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });

    res.json({
      status: "healthy",
      version: "v3.4.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: phTime,
    });
  });

  // 🧾 Google Sheets Test
  app.get("/test-bot", async (req, res) => {
    try {
      const clientEmail =
        process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
      const sheetId = process.env.GOOGLE_SHEET_ID;

      if (!clientEmail || !privateKey || !sheetId)
        throw new Error("❌ Missing Google Sheets credentials");

      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

      const sheets = google.sheets({ version: "v4", auth });
      const sheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

      res.send(`✅ Connected to Google Sheet: ${sheet.data.properties.title}`);
    } catch (err) {
      res.status(500).send(`❌ Google Sheets Test Failed: ${err.message}`);
    }
  });

  // 🤖 Gemini Test
  app.get("/test-gemini", async (req, res) => {
    try {
      const result = await generateContentFn("Say hello from Converge Autopost Bot!");
      res.send(`✅ Gemini Working: ${result}`);
    } catch (err) {
      console.error("Gemini test error:", err.response?.data || err.message);
      res.status(500).send(`❌ Gemini Test Failed: ${err.message}`);
    }
  });

  // 📘 Facebook Test
  app.get("/test-fb", async (req, res) => {
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();

      if (json.name) res.send(`✅ Connected to Facebook Page: ${json.name}`);
      else res.send(`⚠️ Facebook Response: ${JSON.stringify(json)}`);
    } catch (err) {
      res.status(500).send(`❌ Facebook Test Failed: ${err.message}`);
    }
  });

  // ===============================================
  // 🧩 TEST ALL — Combined Service Test
  // ===============================================
  app.get("/test-all", async (req, res) => {
    let logs = [];
    const now = new Date();
    const phTime = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });

    logs.push("🚀 Starting Full Bot Diagnostic...");
    logs.push(`🕒 Local Time (PH): ${phTime}`);
    logs.push("=====================================");

    // --- Gemini ---
    try {
      const gemini = await generateContentFn("Connection test from AutoPostBot");
      logs.push("✅ Gemini Working: " + gemini.slice(0, 120) + "...");
    } catch (err) {
      logs.push("⚠️ Gemini Error: " + (err.response?.data?.error?.message || err.message || err));
    }

    // --- Google Sheets ---
    try {
      const clientEmail =
        process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
      const sheetId = process.env.GOOGLE_SHEET_ID;

      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

      const sheets = google.sheets({ version: "v4", auth });
      const sheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      logs.push(`✅ Google Sheets Connected: ${sheet.data.properties.title}`);
    } catch (err) {
      logs.push("⚠️ Sheets Error: " + (err.message || err));
    }

    // --- Facebook ---
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();
      if (json.name) logs.push(`✅ Facebook Connected: ${json.name}`);
      else logs.push(`⚠️ Facebook Error: ${JSON.stringify(json)}`);
    } catch (err) {
      logs.push("⚠️ Facebook Error: " + (err.message || err));
    }

    logs.push("=====================================");
    logs.push("✅ Test Completed");

    res.send(`<pre>${logs.join("\n")}</pre>`);
  });
}