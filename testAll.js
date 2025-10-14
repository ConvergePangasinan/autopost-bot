// ===============================================
// 🧪 Test Routes for Gemini, Sheets, Facebook
// Version: v3.3.3 (auto-synced)
// ===============================================

import { VERSION } from "./version.js";
import { autoPostToFacebook } from "./facebook.js";
import { generateContent } from "./gemini.js";

export function registerTestRoutes(app, doc, auth) {
  // Health check
  app.get("/test-all", (req, res) => {
    res.json({
      message: "✅ All test routes operational",
      version: VERSION.scripts.testAll,
      timestamp: new Date().toLocaleString("en-PH"),
    });
  });

  // Gemini test
  app.get("/test-gemini", async (req, res) => {
    const text = await generateContent("fast fiber internet");
    res.json({ result: text, version: VERSION.scripts.gemini });
  });

  // Facebook test
  app.get("/test-fb", async (req, res) => {
    const response = await autoPostToFacebook("🧪 Test post from Converge Bot");
    res.json({ result: response, version: VERSION.scripts.facebook });
  });

  // Google Sheet test
  app.get("/test-sheet", async (req, res) => {
    try {
      await doc.loadInfo();
      res.json({
        title: doc.title,
        sheetCount: doc.sheetCount,
        version: VERSION.scripts.testAll,
      });
    } catch (err) {
      res.json({ error: err.message });
    }
  });
}