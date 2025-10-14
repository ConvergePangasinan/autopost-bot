import cron from "node-cron";
import axios from "axios";
import { logActivity } from "./logs.js";

export function setupScheduler(sheet, logSheet) {
  console.log("📅 Scheduler active: 9AM, 12PM, 5PM, 9PM");

  // 4 posts a day
  const schedules = ["0 9 * * *", "0 12 * * *", "0 17 * * *", "0 21 * * *"];

  for (const time of schedules) {
    cron.schedule(time, async () => {
      console.log(`🕘 Running scheduled post at ${time}`);
      await handleAutoPost(sheet, logSheet);
    });
  }
}

async function handleAutoPost(sheet, logSheet) {
  try {
    const rows = await sheet.getRows();
    const pending = rows.find(r => r.Status !== "Posted" && r.Content);

    if (!pending) {
      console.log("ℹ️ No pending post found.");
      return;
    }

    const message = pending.Content;
    const imageUrl = pending.Image || "";
    const token = process.env.PAGE_ACCESS_TOKEN;
    const pageId = process.env.PAGE_ID;

    const endpoint = imageUrl
      ? `https://graph.facebook.com/${pageId}/photos`
      : `https://graph.facebook.com/${pageId}/feed`;

    const params = imageUrl
      ? { access_token: token, message, url: imageUrl }
      : { access_token: token, message };

    const res = await axios.post(endpoint, params);
    console.log("✅ Posted:", res.data);

    pending.Status = "Posted";
    pending.DatePosted = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    await pending.save();

    await logActivity(logSheet, `✅ Posted: ${message.slice(0, 40)}...`);
  } catch (err) {
    console.error("❌ Scheduler error:", err.message);
    await logActivity(logSheet, `❌ Error: ${err.message}`);
  }
}