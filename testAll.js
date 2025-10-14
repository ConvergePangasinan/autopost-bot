// ===============================================
// 🧪 Converge Autopost Bot - Test Routes Module
// Handles Gemini, Sheets, and Facebook connection checks
// ===============================================

import axios from "axios";

export function registerTestRoutes(app, doc, serviceAccountAuth, generateContent) {
  // ✅ Basic routes
  app.get("/", (req, res) => res.send("🚀 Converge Autopost Bot is running"));
  app.get("/ping", (req, res) => res.send("✅ OK - Server awake"));
  app.get("/health", (req, res) => res.json({ status: "healthy" }));

  // ✅ Gemini test
  app.get("/test-gemini", async (req, res) => {
    try {
      const content = await generateContent("Test Converge Ad");
      res.json({ success: true, message: "✅ Gemini working", content });
    } catch (err) {
      res.status(500).json({ success: false, message: "❌ Gemini failed", error: err.message });
    }
  });

  // ✅ Sheets test
  app.get("/test-sheets", async (req, res) => {
    try {
      doc.auth = serviceAccountAuth;
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      await sheet.addRow({
        Timestamp: new Date().toLocaleString("en-PH"),
        Source: "Sheet Test",
        Content: "✅ Sheets connection successful",
      });
      res.json({ success: true, message: "✅ Google Sheets connected successfully" });
    } catch (err) {
      res.status(500).json({ success: false, message: "❌ Sheets test failed", error: err.message });
    }
  });

  // ✅ All systems test
  app.get("/test-all", async (req, res) => {
    const result = { gemini: "❌", sheets: "❌", facebook: "❌" };

    // Gemini
    try {
      const text = await generateContent("System test");
      result.gemini = text ? "✅ Gemini OK" : "❌ Gemini empty";
    } catch {
      result.gemini = "❌ Gemini failed";
    }

    // Sheets
    try {
      doc.auth = serviceAccountAuth;
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      await sheet.addRow({
        Timestamp: new Date().toLocaleString("en-PH"),
        Source: "TestAll",
        Content: "✅ Sheets OK",
      });
      result.sheets = "✅ Sheets OK";
    } catch {
      result.sheets = "❌ Sheets failed";
    }

    // Facebook
    try {
      const fb = await axios.post(
        `https://graph.facebook.com/${process.env.FB_PAGE_ID}/feed`,
        { message: "✅ Test post from /test-all", access_token: process.env.FB_PAGE_ACCESS_TOKEN }
      );
      result.facebook = fb.data.id ? "✅ Facebook OK" : "❌ Facebook failed";
    } catch {
      result.facebook = "❌ Facebook failed";
    }

    res.json({ version: process.env.VERSION || "v3.2.5", result });
  });
}