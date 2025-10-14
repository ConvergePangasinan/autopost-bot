// ===============================================
// 🚀 Converge AutoPost Bot - Server (Root Version)
// Version: v3.4.1
// ===============================================

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
// 🚀 Initialize Scheduler
// ===============================================
(async () => {
  try {
    const doc = await connectToSheet();
    await schedulePosts(doc);
    console.log("🕓 Scheduler initialized (9AM, 12PM, 5PM, 9PM)");
  } catch (err) {
    console.error("❌ Failed to start scheduler:", err.message);
  }
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