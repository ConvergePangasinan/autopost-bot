// ===============================================
// 🚀 Converge AutoPost Bot Server (v3.4.4)
// Root Version - Google Sheets + Facebook Scheduler
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import { connectToSheet } from "./googleSheet.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// ===============================================
// 🔗 TEST API
// ===============================================
app.get("/", (req, res) => {
  res.send("✅ Converge AutoPost Bot Server is running!");
});

app.get("/test", async (req, res) => {
  try {
    const doc = await connectToSheet();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();

    const rows = await sheet.getRows();
    res.json({ totalRows: rows.length, sheetTitle: sheet.title });
  } catch (error) {
    console.error("❌ Test API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===============================================
// 🧠 GET PENDING POSTS
// ===============================================
app.get("/pending-posts", async (req, res) => {
  try {
    console.log("📋 Checking for pending posts...");

    const doc = await connectToSheet();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const now = moment().tz("Asia/Manila");

    const pendingPosts = rows.filter((row) => {
      const status = (row["Status"] || "").toLowerCase();
      const time = row["Scheduled_Time"];
      if (!time) return false;

      const scheduledTime = moment.tz(time, "Asia/Manila");
      return status === "pending" && scheduledTime.isBefore(now);
    });

    console.log(`🕒 Pending posts found: ${pendingPosts.length}`);
    res.json(pendingPosts.map((row) => ({
      id: row["ID"],
      page_name: row["Page_Name"],
      message: row["Message"],
      image_url: row["Image_URL"],
      scheduled_time: row["Scheduled_Time"],
      status: row["Status"],
      error_message: row["Error_Message"],
    })));
  } catch (err) {
    console.error("❌ Error fetching pending posts:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// 🚀 START SERVER
// ===============================================
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌐 Connecting to Google Sheets...");

  try {
    const doc = await connectToSheet();
    console.log(`✅ Connected to Google Sheet: ${doc.title}`);
    console.log("⏰ Checking for scheduled posts...");

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const pending = rows.filter((row) => 
      (row["Status"] || "").toLowerCase() === "pending"
    );

    console.log(`🕒 Pending posts found: ${pending.length}`);
    if (pending.length === 0) {
      console.log("⚠️ No pending posts found. Scheduler idle.");
    }
    console.log("🎉 Your service is live and ready!");
  } catch (err) {
    console.error("❌ Google Sheets connection error:", err.message);
  }
});