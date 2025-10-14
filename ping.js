// ===============================================
// 🔁 Keep-Alive Ping Script for Render
// Version: v3.3.8 (Stable)
// ===============================================

import fetch from "node-fetch";

// 🌍 Use your Render app public URL (auto from env or fallback)
const url = process.env.PING_URL || "https://autopost-bot-m222.onrender.com";

console.log(`🔁 Starting keep-alive ping to ${url}`);

// 🕒 Ping every 14 minutes (Render free tier sleeps after 15)
const PING_INTERVAL = 14 * 60 * 1000;

async function pingServer() {
  const timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });

  try {
    const res = await fetch(`${url}/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [${timestamp}] Ping successful — Status: ${data.status}, Env: ${data.environment}`);
    } else {
      console.warn(`⚠️ [${timestamp}] Ping returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ [${timestamp}] Ping failed: ${err.message}`);
  }
}

// 🔄 Start ping loop
pingServer(); // immediate first ping
setInterval(pingServer, PING_INTERVAL);