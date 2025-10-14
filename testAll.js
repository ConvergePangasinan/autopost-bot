// ===============================================
// 🧪 Test All Connections — Manual Mode
// ===============================================

export function registerTestRoutes(app, doc) {
  app.get("/test-all", async (req, res) => {
    const logs = [];
    logs.push("🚀 Full Bot Diagnostic");
    logs.push(`🕒 PH Local Time: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`);
    logs.push("----------------------------------------");

    // Google Sheets
    try {
      await doc.loadInfo();
      logs.push(`✅ Google Sheets Connected: ${doc.title}`);
    } catch (e) {
      logs.push("⚠️ Google Sheets Error: " + e.message);
    }

    // Facebook
    try {
      const pageId = process.env.FB_PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN;
      const r = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const json = await r.json();
      if (json.name) logs.push(`✅ Facebook Connected: ${json.name}`);
      else logs.push(`⚠️ Facebook Error: ${JSON.stringify(json)}`);
    } catch (e) {
      logs.push("⚠️ Facebook Error: " + e.message);
    }

    logs.push("----------------------------------------");
    res.send(`<pre>${logs.join("\n")}</pre>`);
  });
}