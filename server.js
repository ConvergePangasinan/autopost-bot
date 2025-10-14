// ===============================================
// 🚀 Converge AutoPost Bot - Server (Root Version)
// Version: v3.4.0
// ===============================================
import express from "express";
import dotenv from "dotenv";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { autoPostToFacebook } from "./facebook.js";
import { schedulePosts } from "./scheduler.js";
import { appendLog } from "./logs.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ===============================================
// 🔐 Load Google Credentials
// ===============================================
let creds;
try {
  if (!process.env.GOOGLE_CREDENTIALS) throw new Error("Missing GOOGLE_CREDENTIALS in .env");
  creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (err) {
  console.error("❌ Invalid GOOGLE_CREDENTIALS:", err.message);
  process.exit(1);
}

// Setup JWT Auth
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===============================================
// 📄 Connect to Google Sheet
// ===============================================
async function connectToSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log("✅ Connected to Google Sheet:", doc.title);
    return doc;
  } catch (err) {
    console.error("❌ Google Sheet connection failed:", err.message);
    process.exit(1);
  }
}

// ===============================================
// 🧾 Manual Trigger: /test-all
// ===============================================
app.get("/test-all", async (req, res) => {
  try {
    const doc = await connectToSheet();
    const sheet = doc.sheetsByTitle["Posts"];
    const rows = await sheet.getRows();

    if (!rows.length) return res.send("⚠️ No posts found.");

    for (const row of rows) {
      const message = row.Message || row.Content;
      if (message) {
        const fbResult = await autoPostToFacebook(message);
        await appendLog(doc, {
          timestamp: new Date().toLocaleString("en-PH"),
          message,
          status: fbResult.success ? "✅ Posted" : "❌ Failed",
          error: fbResult.error || "",
        });
      }
    }
    res.send("✅ Completed. Check Logs sheet.");
  } catch (err) {
    console.error("❌ /test-all error:", err.message);
    res.status(500).send("Server error: " + err.message);
  }
});

// ===============================================
// 🚀 Initialize + Scheduler
// ===============================================
(async () => {
  const doc = await connectToSheet();
  schedulePosts(doc);
  console.log("🕓 Scheduler initialized (9AM, 12PM, 5PM, 9PM)");
})();

// Root route
app.get("/", (req, res) => res.send("✅ Converge AutoPost Bot Server is running..."));

// Start server
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));