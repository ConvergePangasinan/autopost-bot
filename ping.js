// ===============================================
// 🔁 Keep-Alive & Health Check Pinger for Render
// Version: v3.4.1 (OpenRouter Edition)
// ===============================================

import fetch from "node-fetch";
import moment from "moment-timezone";

const timezone = "Asia/Manila";
const url = process.env.PING_URL || "https://your-render-app.onrender.com";

console.log(`🔁 Starting 10-minute keep-alive pings to: ${url}`);
console.log(`🕒 Timezone: ${timezone}`);

const getTime = () => moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss");

async function pingServer() {
  try {
    const res = await fetch(`${url}/test-all`);
    const text = await res.text();
    console.log(`[${getTime()}] ✅ Keep-alive ping OK — Response:`, text.slice(0, 100), "...");
  } catch (err) {
    console.error(`[${getTime()}] ⚠️ Ping failed:`, err.message);
  }
}

// Run immediately on start, then every 10 minutes
pingServer();
setInterval(pingServer, 10 * 60 * 1000);