// ===============================================
// 🔄 Keep-Alive Pinger - Converge AutoPost Bot
// Version: v3.4.3
// Author: Edward John Paulo
// ===============================================

import cron from "node-cron";
import fetch from "node-fetch";
import { logMessage } from "./logs.js";

// ✅ Replace this with your Render server URL
const SERVER_URL = process.env.SERVER_URL || "https://your-render-app-name.onrender.com";

// ✅ Ping the server to keep it alive
async function pingServer() {
  try {
    const res = await fetch(SERVER_URL);
    if (res.ok) {
      logMessage(`🟢 Keep-alive ping successful at ${new Date().toLocaleTimeString()}`);
    } else {
      logMessage(`🟡 Ping responded with status ${res.status}`);
    }
  } catch (error) {
    logMessage(`🔴 Ping failed: ${error.message}`);
  }
}

// ✅ Schedule the pinger every 10 minutes
export function startKeepAlive() {
  logMessage("✅ Keep-Alive pinger initialized (every 10 minutes)");
  cron.schedule("*/10 * * * *", pingServer);
}