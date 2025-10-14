// ===============================================
// 🚀 Converge Autopost Bot - Main Server
// Auto-versioned via version.js
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { registerTestRoutes } from "./testAll.js";
import { generateContent } from "./gemini.js";
import { autoPostToFacebook } from "./facebook.js";
import { VERSION } from "./version.js"; // ✅ import version info

dotenv.config();
const app = express();

// ===============================================
// 🧾 Version Route
// ===============================================
app.get("/version", (req, res) => {
  res.json({
    app: VERSION.app,
    author: VERSION.author,
    version: VERSION.build,
    scripts: VERSION.scripts,
    updated: VERSION.updated,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toLocaleString("en-PH"),
  });
});

// ... rest of your code remains same ...