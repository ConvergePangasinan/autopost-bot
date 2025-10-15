// ===============================================
// 🕓 Scheduler - Converge AutoPost Bot
// Version: v3.4.4 (Integrated with googleSheet.js)
// ===============================================

import cron from "node-cron";
import { connectToSheet } from "./googleSheet.js";
import { appendLog, logMessage } from "./logs.js";

// ✅ Function to read and process pending posts
async function postScheduledTasks() {
  try {
    const doc = await connectToSheet();
    const sheet = doc.sheetsByTitle["Posts"];

    if (!sheet) {
      logMessage("⚠️ 'Posts' sheet not found.");
      return;
    }

    const rows = await sheet.getRows();
    const now = new Date();

    // Filter posts with Status = 'Pending' and ScheduleTime <= now
    const duePosts = rows.filter((row) => {
      const scheduleTime = new Date(row.ScheduleTime);
      return (
        row.Status?.toLowerCase() === "pending" &&
        !isNaN(scheduleTime) &&
        scheduleTime <= now
      );
    });

    if (duePosts.length === 0) {
      logMessage("⏳ No pending posts due at this time.");
      return;
    }

    logMessage(`📢 Found ${duePosts.length} post(s) ready for upload.`);

    // Simulated posting loop (replace with your Facebook logic)
    for (const post of duePosts) {
      try {
        logMessage(`🚀 Posting: ${post.Caption || "(No Caption)"}...`);

        // TODO: Replace this with your actual Facebook posting logic
        await new Promise((resolve) => setTimeout(resolve, 1000));

        post.Status = "Posted";
        await post.save();

        await appendLog(doc, {
          timestamp: new Date().toISOString(),
          status: "Success",
          message: `Posted: ${post.Caption || "(No Caption)"}`,
        });

        logMessage(`✅ Successfully posted: ${post.Caption || "Untitled"}`);
      } catch (err) {
        await appendLog(doc, {
          timestamp: new Date().toISOString(),
          status: "Error",
          message: `Failed to post: ${post.Caption} - ${err.message}`,
        });
        logMessage(`❌ Error posting ${post.Caption}: ${err.message}`);
      }
    }
  } catch (err) {
    logMessage(`❌ Scheduler error: ${err.message}`);
  }
}

// ✅ Initialize Scheduler
export async function scheduleAllTasks() {
  try {
    await connectToSheet();
    logMessage("✅ Scheduler initialized successfully.");

    // Runs every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      logMessage("🕓 Running scheduled post task...");
      await postScheduledTasks();
    });

    logMessage("🔁 Task scheduler running every 15 minutes.");
  } catch (err) {
    logMessage(`❌ Failed to initialize scheduler: ${err.message}`);
  }
}

// ✅ Manual trigger export
export { postScheduledTasks };