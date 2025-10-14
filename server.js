// ===============================================
// 🚀 Converge AutoPost Bot - Server (Root Version)
// Version: v3.4.0
// ===============================================
import { startScheduler } from "./scheduler.js";
import express from "express";
import dotenv from "dotenv";
import { connectToSheet } from "./googleSheet.js";
import { autoPostToFacebook } from "./facebook.js";
import { schedulePosts } from "./scheduler.js";
import { appendLog } from "./logs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================================
// 🔐 Google Credentials Setup
// ===============================================
let creds;
try {
  if (!process.env.GOOGLE_CREDENTIALS) throw new Error("Missing GOOGLE_CREDENTIALS in environment");
  creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (err) {
  console.error("❌ Failed to parse GOOGLE_CREDENTIALS:", err.message);
  process.exit(1);
}

// Authenticate using google-auth-library
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
    console.error("❌ Google Sheets connection error:", err.message);
    process.exit(1);
  }
}

// ===============================================
// 🧾 Test-All Endpoint (Manual Trigger)
// ===============================================
app.get("/test-all", async (req, res) => {
  try {
    const doc = await connectToSheet();
    const sheet = doc.sheetsByTitle["Posts"];
    const rows = await sheet.getRows();

    if (!rows.length) return res.send("⚠️ No posts found in sheet.");

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

    res.send("✅ Test-All completed. Check Logs sheet for results.");
  } catch (err) {
    console.error("❌ /test-all error:", err.message);
    res.status(500).send("Server error: " + err.message);
  }
});

// ===============================================
// 🚀 Initialize Server + Scheduler
// ===============================================
(async () => {
  const doc = await connectToSheet();
  schedulePosts(doc);
  console.log("🕓 Scheduler initialized (9AM, 12PM, 5PM, 9PM)");
})();

// ===============================================
// 🟢 Root Route
// ===============================================
app.get("/", (req, res) => {
  res.send("✅ Converge AutoPost Bot Server is running...");
});

// ===============================================
// 🖥️ Start Server
// ===============================================
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));