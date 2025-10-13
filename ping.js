// ===============================================
// ping.js - simple keepalive ping script
// Version: v3.2.0
// ===============================================
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const PING_URL = process.env.KEEPALIVE_URL || `https://${process.env.RENDER_SERVICE_DOMAIN || "autopost-bot-m222.onrender.com"}/ping`;

async function ping() {
  try {
    const res = await fetch(PING_URL);
    console.log(`${new Date().toISOString()} - Pinged ${PING_URL} - status ${res.status}`);
  } catch (err) {
    console.error("Ping failed:", err?.message || err);
  }
}

ping();