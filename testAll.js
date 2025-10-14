// ===============================================
  // 🧩 TEST ALL — Combined Service Test
  // ===============================================
  app.get("/test-all", async (req, res) => {
    let logs = [];
    try {
      logs.push("🚀 Starting Full Bot Diagnostic...");

      // --- Gemini ---
      try {
        const gemini = await generateContentFn("Connection test from AutoPostBot");
        logs.push("✅ Gemini Working: " + gemini.slice(0, 100) + "...");
      } catch (err) {
        logs.push("⚠️ Gemini Error: " + (err.message || err));
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

      logs.push("✅ Test Completed");
      res.send(`<pre>${logs.join("\n")}</pre>`);
    } catch (err) {
      console.error("❌ TEST-ALL FATAL ERROR:", err);
      res.status(500).send(`<pre>❌ TEST-ALL FAILED: ${err.message}\n${logs.join("\n")}</pre>`);
    }
  });