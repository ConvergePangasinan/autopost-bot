// ===============================================
// 🔁 Keep-Alive Ping Script for Render / Free Tier
// Version: v3.4.0
// ===============================================

import fetch from "node-fetch";

const url = process.env.PING_URL || "https://your-render-app.onrender.com";
console.log(`🔁 Starting keep-alive ping to ${url}`);

setInterval(async () => {
  const timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  try {
    const res = await fetch(url);
    console.log(`✅ [${timestamp}] Ping successful: ${res.status}`);
  } catch (err) {
    console.error(`⚠️ [${timestamp}] Ping failed: ${err.message}`);
  }
}, 10 * 60 * 1000); // every 10 minutes