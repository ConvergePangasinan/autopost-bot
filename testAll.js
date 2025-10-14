// ===============================================
// 🧪 TestAll Diagnostic Module
// Version: v3.3.8 (Gemini 2.5 Flash Compatible)
// ===============================================

import fetch from "node-fetch";

// ✅ Register test routes
export function registerTestRoutes(app, doc, serviceAccountAuth, generateContent) {
  // ---------------------------------------------
  // 🔍 Route: /test-all
  // ---------------------------------------------
  app.get("/test-all", async (req, res) => {
    const results = [];
    const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    console.log(`\n🚀 Starting Full Bot Diagnostic...`);
    console.log(`🕒 PH Local Time: ${now}`);
    console.log("----------------------------------------");

    // --- Gemini ---
    try {
      const testText = await generateContent("Say hello from Converge Autopost Bot!");
      if (testText.toLowerCase().includes("hello"))
        results.push("✅ Gemini Working: Connection OK");
      else results.push("⚠️ Gemini Working but response incomplete");
    } catch (e) {
      console.error("❌ Gemini Error:", e.message);
      results.push("⚠️ Gemini Error: " + e.message);
    }

    // --- Google Sheets ---
    try {
      await doc.loadInfo();
      results.push(`✅ Google Sheets Connected: ${doc.title}`);
    } catch (e) {
      console.error("❌ Google Sheets Error:", e.message);
      results.push("⚠️ Google Sheets Error: " + e.message);
    }

    // --- Facebook ---
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
      const fb = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const data = await fb.json();
      if (data.name) results.push(`✅ Facebook Connected: ${data.name}`);
      else results.push(`⚠️ Facebook Error: ${JSON.stringify(data)}`);
    } catch (e) {
      console.error("❌ Facebook Error:", e.message);
      results.push("⚠️ Facebook Error: " + e.message);
    }

    // --- Summary ---
    console.log("----------------------------------------");
    results.forEach((r) => console.log(r));

    if (results.some((r) => r.startsWith("⚠️") || r.startsWith("❌"))) {
      console.log("❌ Some services failed");
      results.push("----------------------------------------");
      results.push("❌ Some services failed");
    } else {
      console.log("✅ All systems operational");
      results.push("----------------------------------------");
      results.push("✅ All systems operational");
    }

    res.send(`
      <h2>🚀 Full Diagnostic Report</h2>
      <p>🕒 PH Local Time: ${now}</p>
      <pre>${results.join("\n")}</pre>
    `);
  });

  // ---------------------------------------------
  // 🌡️ Route: /health
  // ---------------------------------------------
  app.get("/health", (req, res) => {
    const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    res.json({
      status: "healthy",
      version: "v3.3.8",
      environment: process.env.NODE_ENV || "production",
      timestamp: now,
      timezone: "Asia/Manila",
    });
  });
}