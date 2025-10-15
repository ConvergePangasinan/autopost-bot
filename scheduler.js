// ===============================================
// ⏰ Scheduler for AutoPost Bot
// ===============================================

import { getPendingPosts } from "./googleSheet.js";

export const scheduleAllTasks = async () => {
  console.log("🕓 Checking for scheduled posts...");

  try {
    const posts = await getPendingPosts();

    if (!posts.length) {
      console.log("⚠️ No pending posts found. Scheduler idle.");
      return;
    }

    for (const post of posts) {
      console.log(`📢 Ready to post: ${post.Message} (${post.Date} ${post.Time})`);
      // You can later add Facebook API posting here
    }

    console.log("✅ Scheduler executed successfully.");
  } catch (err) {
    console.error("❌ Scheduler error:", err.message);
  }
};