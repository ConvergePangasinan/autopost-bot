// ===============================================
// ⏰ Scheduler (Posts 9AM, 12PM, 5PM, 9PM)
// Version: v3.4.1
// ===============================================
import cron from "node-cron";
import moment from "moment-timezone";
import { autoPostToFacebook } from "./facebook.js";
import { appendLog } from "./logs.js";

export async function schedulePosts(doc) {
  const times = ["09:00", "12:00", "17:00", "21:00"];

  times.forEach((time) => {
    const [hour, minute] = time.split(":");
    const cronExp = `${minute} ${hour} * * *`;

    cron.schedule(cronExp, async () => {
      try {
        const now = moment().tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss");
        console.log(`🕒 Running scheduled post at ${now} (${time})`);

        const sheet = doc.sheetsByTitle["Posts"];
        const rows = await sheet.getRows();

        if (!rows.length) {
          console.log("⚠️ No posts found in sheet.");
          return;
        }

        // ✅ Pick next unpublished post
        const nextPost = rows.find((r) => !r.Posted || r.Posted === "");
        if (!nextPost) {
          console.log("✅ All posts have been published.");
          return;
        }

        const message = nextPost.Message || nextPost.Content;
        if (!message) {
          console.log("⚠️ Skipped empty message row.");
          return;
        }

        const fbResult = await autoPostToFacebook(message);

        await appendLog(doc, {
          timestamp: now,
          message,
          status: fbResult.success ? "✅ Posted" : "❌ Failed",
          error: fbResult.error || "",
        });

        if (fbResult.success) {
          nextPost.Posted = "✅";
          await nextPost.save();
          console.log("📤 Posted successfully:", message);
        } else {
          console.log("❌ Post failed:", fbResult.error);
        }
      } catch (err) {
        console.error("❌ Scheduler error:", err.message);
      }
    });
  });
}