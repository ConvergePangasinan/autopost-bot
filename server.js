// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.4.3 (Root + GOOGLE_CREDENTIALS + KeepAlive)
// Author: Edward John Paulo
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { getPendingPosts, connectToSheet } from "./googleSheet.js";
import { scheduleAllTasks } from "./scheduler.js";
import { logMessage } from "./logger.js";
import { startKeepAlive } from "./ping.js"; // ✅ Added KeepAlive pinger

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ===============================================
// 🔹 Middleware
// ===============================================
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ===============================================
// 🔹 Root Endpoint (Health Check)
// ===============================================
app.get("/", async (req, res) => {
  res.send("✅ Converge AutoPost Bot Server is running...");
});

// ===============================================
// 🔹 Get Pending Posts (for Preview / Dashboard)
// ===============================================
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await getPendingPosts();
    if (!posts || posts.length === 0) {
      logMessage("⚠️ No pending posts found in sheet");
    }
    res.json(posts);
  } catch (err) {
    logMessage(`❌ Error fetching posts: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ===============================================
// 🔹 Manual Trigger Endpoint
// ===============================================
app.post("/api/manual-trigger", async (req, res) => {
  try {
    logMessage("⚙️ Manual trigger started...");
    await scheduleAllTasks();
    res.json({ success: true, message: "Manual trigger executed successfully" });
  } catch (err) {
    logMessage(`❌ Manual trigger error: ${err.message}`);
    res.status(500).json({ error: "Manual trigger failed" });
  }
});

// ===============================================
// 🔹 Initialization (Google Sheets + Scheduler)
// ===============================================
(async () => {
  try {
    logMessage("🔄 Connecting to Google Sheets...");
    await connectToSheet();
    logMessage("🕓 Scheduling all tasks...");
    await scheduleAllTasks();

    // ✅ Start KeepAlive ping
    startKeepAlive();

  } catch (err) {
    logMessage(`❌ Initialization error: ${err.message}`);
  }
})();

// ===============================================
// 🔹 Start Express Server
// ===============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  logMessage(`🚀 Server running on port ${PORT}`);
});