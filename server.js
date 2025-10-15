// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.4.4 (Root + GOOGLE_CREDENTIALS + Simplified)
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { getPendingPosts, connectToSheet } from "./googleSheet.js";
import { scheduleAllTasks } from "./scheduler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 🔹 Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// ===============================================
// 🔹 Test Endpoint
// ===============================================
app.get("/", async (req, res) => {
  res.send("✅ Converge AutoPost Bot Server is running...");
});

// ===============================================
// 🔹 Get Pending Posts (for Preview / UI)
// ===============================================
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await getPendingPosts();
    if (posts.length === 0) {
      console.log("⚠️ No pending posts found in Google Sheet");
    }
    res.json(posts);
  } catch (err) {
    console.error("❌ Error fetching posts:", err.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ===============================================
// 🔹 Manual Trigger Endpoint
// ===============================================
app.post("/api/manual-trigger", async (req, res) => {
  try {
    console.log("⚙️ Manual trigger started...");
    await scheduleAllTasks();
    res.json({ success: true, message: "Manual trigger executed successfully" });
  } catch (err) {
    console.error("❌ Manual trigger error:", err.message);
    res.status(500).json({ error: "Manual trigger failed" });
  }
});

// ===============================================
// 🔹 Initialize Scheduler (Auto Mode)
// ===============================================
(async () => {
  try {
    console.log("🔄 Connecting to Google Sheets...");
    await connectToSheet();
    console.log("🕓 Scheduling all tasks...");
    await scheduleAllTasks();
  } catch (err) {
    console.error("❌ Initialization error:", err.message);
  }
})();

// ===============================================
// 🔹 Start Server
// ===============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});