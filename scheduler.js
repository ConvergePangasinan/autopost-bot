// ===============================================
// ⏰ Scheduler Module (v3.4.0)
// Handles automatic Facebook posts at fixed times
// ===============================================

import cron from "node-cron";
import moment from "moment-timezone";
import { autoPostToFacebook } from "./facebook.js";
import { appendLog } from "./logs.js";
import { connectToSheet } from "./googleSheet.js";

// ===============================================
// 🕓 Scheduled Post Times (Manila Time)
// ===============================================
// 9AM, 12PM, 5PM, 9PM — every day
const scheduleTimes = [
  { time: "0 9 * * *", label: "9AM" },
  { time: "0 12 * * *", label: "12PM" },
  { time: "0 17 * * *", label: "5PM" },
  { time: "0 21 * * *", label: "9PM" },
];

// ===============================================
// 🚀 Main Scheduler Function
// ===============================================
export async function schedulePosts(doc) {
  console.log("🕓 Scheduler initialized (9AM, 12PM, 5PM, 9PM)");

  for (const { time, label } of scheduleTimes) {
    cron.schedule(
      time,
      async () => {
        const now = moment().tz("Asia/Manila").format("YYYY-MM-DD hh:mm A");
        console.log(`⏰ Running scheduled post (${label}) at ${now}`);

        try {
          const sheet = doc.sheetsByTitle["Posts"];
          const rows = await sheet.getRows();
          if (!rows.length) {
            console.log("⚠️ No posts found in sheet.");
            return;
          }

          const row = rows.shift(); // take first row
          const message = row.Message || row.Content;

          if (message) {
            const fbResult = await autoPostToFacebook(message);

            await appendLog(doc, {
              timestamp: now,
              message,
              status: fbResult.success ? "✅ Posted" : "❌ Failed",
              error: fbResult.error || "",
            });

            // Remove the posted row to avoid duplicate posting
            await row.delete();
            console.log(`✅ Posted and removed "${message}" from queue.`);
          }
        } catch (err) {
          console.error(`❌ Scheduler (${label}) error:`, err.message);
        }
      },
      { timezone: "Asia/Manila" }
    );
  }
}