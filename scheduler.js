// ===============================================
// 🕓 Scheduler (4x Daily AutoPost)
// ===============================================

import cron from "node-cron";
import moment from "moment-timezone";
import { autoPostToFacebook } from "./facebook.js";
import { appendLog } from "./logs.js";

export function schedulePosts(doc) {
  const times = ["09:00", "12:00", "17:00", "21:00"];

  for (const t of times) {
    const [hour, minute] = t.split(":");
    cron.schedule(`${minute} ${hour} * * *`, async () => {
      try {
        const phTime = moment().tz("Asia/Manila").format("YYYY-MM-DD hh:mm A");
        console.log(`🕓 Running scheduled post at ${phTime}`);

        const sheet = doc.sheetsByTitle["Posts"];
        const rows = await sheet.getRows();
        const row = rows.find(r => !r.Posted); // pick first unposted

        if (!row) {
          console.log("⚠️ No unposted rows found.");
          return;
        }

        const message = row.Message || row.Content;
        if (!message) return;

        const fbResult = await autoPostToFacebook(message);
        row.Posted = "TRUE";
        row.Timestamp = phTime;
        await row.save();

        await appendLog(doc, {
          timestamp: phTime,
          message,
          status: fbResult.success ? "✅ Posted (Scheduled)" : "❌ Failed",
          error: fbResult.error || "",
        });

        console.log("✅ Scheduled post done:", message.slice(0, 30));
      } catch (err) {
        console.error("❌ Scheduler error:", err.message);
      }
    });
  }
}