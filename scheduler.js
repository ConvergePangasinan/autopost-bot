// ===============================================
// ⏰ Scheduler (4x Daily Autopost)
// ===============================================
import cron from "node-cron";
import { autoPostToFacebook } from "./facebook.js";

export function initScheduler(doc) {
  console.log("🕒 Scheduler initialized — 9AM, 12PM, 5PM, 9PM (Asia/Manila)");

  async function runAutoPost() {
    try {
      console.log("🚀 Running scheduled autopost...");
      await doc.loadInfo();

      const pendingSheet = doc.sheetsByTitle["Pending"] || doc.sheetsByIndex[0];
      const logSheet = doc.sheetsByTitle["Logs"];
      const rows = await pendingSheet.getRows();

      for (const row of rows) {
        if (row.Status === "Pending" || row.Status === "pending") {
          const caption = row.Caption || "Converge Internet Update";
          const fbResponse = await autoPostToFacebook(caption);

          const timestamp = new Date().toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          });

          if (fbResponse.success) {
            row.Status = "✅ Posted";
            row.PostID = fbResponse.postId;
            row.Timestamp = timestamp;
            await row.save();

            if (logSheet) {
              await logSheet.addRow({
                Timestamp: timestamp,
                Caption: caption,
                Status: "✅ Posted",
                Source: "Scheduled",
                Error: "",
              });
            }

            console.log(`✅ Posted: ${caption}`);
          } else {
            if (logSheet) {
              await logSheet.addRow({
                Timestamp: timestamp,
                Caption: caption,
                Status: "❌ Failed",
                Source: "Scheduled",
                Error: fbResponse.error,
              });
            }
            console.error(`❌ Failed to post: ${fbResponse.error}`);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in autopost:", err.message);
    }
  }

  // Schedule 4x daily: 9AM, 12PM, 5PM, 9PM
  cron.schedule("0 9,12,17,21 * * *", runAutoPost, {
    timezone: "Asia/Manila",
  });
}