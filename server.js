// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.4.4 (Simplified - Render Ready)
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { connectToSheet, getPendingPosts } from "./googleSheet.js";
import { scheduleAllTasks } from "./scheduler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000; // ✅ Render will assign the port automatically

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// =================================================
// ✅ Root Route
// =================================================
app.get("/", (req, res) => {
  res.send("✅ Converge AutoPost Bot Server is running...");
});

// =================================================
// ✅ Get Pending Posts (for Preview / Debug)
// =================================================
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await getPendingPosts();
    res.json(posts);
  } catch (err) {
    console.error("❌ Error fetching posts:", err.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// =================================================
// ✅ Manual Trigger (Run Tasks Now)
// =================================================
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

// =================================================
// 🕒 Scheduler Startup
// =================================================
(async () => {
  try {
    console.log("🔄 Connecting to Google Sheet...");
    await connectToSheet();
    console.log("🕓 Scheduling all tasks...");
    await scheduleAllTasks();
  } catch (err) {
    console.error("❌ Initialization error:", err.message);
  }
})();

// =================================================
// 🌐 Start Server
// =================================================
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});