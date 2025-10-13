import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const URL = process.env.RENDER_URL || "https://autopost-bot-m222.onrender.com";

async function ping() {
  try {
    const res = await fetch(URL);
    console.log(`✅ Ping successful: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error("❌ Ping failed:", err.message);
  }
}

ping();