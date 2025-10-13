import express from "express";
import schedule from "node-schedule";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// --- Health Route (for UptimeRobot / BetterStack) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Mock Functions (Replace with your real logic) ---
async function generateContent(source) {
  console.log(`[${new Date().toLocaleTimeString()}] ✨ Generating content from ${source}...`);
  // Add Gemini/HuggingFace logic here
  await new Promise((res) => setTimeout(res, 2000)); // simulate delay
  console.log(`✅ ${source} content generated successfully`);
}

async function postToFacebook() {
  console.log(`[${new Date().toLocaleTimeString()}] 📘 Posting to Facebook...`);
  // Add your Facebook API logic here
  await new Promise((res) => setTimeout(res, 1500));
  console.log("✅ Posted to Facebook successfully!");
}

// --- Schedule: Generate 2 contents every 3 hours ---
const contentJob = schedule.scheduleJob("0 */3 * * *", async () => {
  console.log("\n🕒 Scheduled Content Generation Triggered");
  await generateContent("Gemini (Main)");
  await generateContent("HuggingFace (Reserve)");
});

// --- Schedule: Post every 4 hours ---
const postJob = schedule.scheduleJob("0 */4 * * *", async () => {
  console.log("\n🕒 Scheduled Facebook Post Triggered");
  await postToFacebook();
});

// --- Daily Reset at 4 AM ---
const dailyResetJob = schedule.scheduleJob("0 4 * * *", () => {
  console.log("\n🌅 4 AM Reset Triggered — Generating new content batch...");
  generateContent("Gemini (Main)");
  generateContent("HuggingFace (Reserve)");
});

// --- Root Route ---
app.get("/", (req, res) => {
  res.send("🚀 AutoPost Bot Server is running fine!");
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});