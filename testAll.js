// ===============================================
// 🧪 Test Routes (Gemini, Sheets, Facebook, All)
// Version: v3.4.0
// ===============================================

import { google } from "googleapis";

export function registerTestRoutes(app, doc, serviceAccountAuth, generateContentFn) {
  // Health / version info
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

  // Google Sheets test
  app.get("/test-bot", async (req, res) => {
    try {
      const clientEmail =
        process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
      const sheetId = process.env.GOOGLE_SHEET_ID;

      if (!clientEmail || !privateKey || !sheetId) {
        throw new Error("Missing Google Sheets credentials");
      }

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

  // Gemini test
  app.get("/test-gemini", async (req, res) => {
    try {
      const out = await generateContentFn("Say hello from Converge Autopost Bot!");
      res.send(`✅ Gemini Working: ${out}`);
    } catch (err) {
      console.error("❌ test-gemini error:", err.response?.data || err.message);
      res.status(500).send(`❌ Gemini Test Failed: ${err.message}`);
    }
  });

  // Facebook test
  app.get("/test-fb", async (req, res) => {
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();

      if (json.name) {
        res.send(`✅ Connected to Facebook Page: ${json.name}`);
      } else {
        res.send(`⚠️ Facebook Response: ${JSON.stringify(json)}`);
      }
    } catch (err) {
      res.status(500).send(`❌ Facebook Test Failed: ${err.message}`);
    }
  });

  // Combined “test all” route
  app.get("/test-all", async (req, res) => {
    const logs = [];
    const now = new Date();
    const phTime = now.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    logs.push("🚀 Starting Full Bot Diagnostic");
    logs.push(`🕒 PH Local Time: ${phTime}`);
    logs.push("----------------------------------------");

    let status = { gemini: false, sheets: false, facebook: false };

    // Gemini
    try {
      const out = await generateContentFn("Connection test from AutoPostBot");
      status.gemini = true;
      logs.push("✅ Gemini Working: " + out.slice(0, 100) + "...");
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      logs.push("⚠️ Gemini Error: " + msg);
    }

    // Sheets
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
      status.sheets = true;
      logs.push(`✅ Google Sheets: ${sheet.data.properties.title}`);
    } catch (err) {
      logs.push("⚠️ Sheets Error: " + (err.message || err));
    }

    // Facebook
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();
      if (json.name) {
        status.facebook = true;
        logs.push(`✅ Facebook: ${json.name}`);
      } else {
        logs.push(`⚠️ Facebook Error: ${JSON.stringify(json)}`);
      }
    } catch (err) {
      logs.push("⚠️ Facebook Error: " + (err.message || err));
    }

    logs.push("----------------------------------------");
    const allOk = status.gemini && status.sheets && status.facebook;
    logs.push(allOk ? "✅ All Services OK" : "❌ Some services failed");

    // Output type: JSON if requested, else human-readable
    if (req.query.format === "json") {
      res.json({
        status: {
          gemini: status.gemini ? "✅" : "❌",
          sheets: status.sheets ? "✅" : "❌",
          facebook: status.facebook ? "✅" : "❌",
          overall: allOk ? "✅" : "❌",
        },
        timestamp: phTime,
        environment: process.env.NODE_ENV || "development",
      });
    } else {
      res.send(`<pre>${logs.join("\n")}</pre>`);
    }
  });
}