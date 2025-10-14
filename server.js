import express from "express";
import dotenv from "dotenv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setupScheduler } from "./scheduler.js";
import { logActivity } from "./logs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Google Sheet Auth ===
const credsPath = path.join(__dirname, "google-credentials.json");
if (!fs.existsSync(credsPath)) {
  console.error("❌ google-credentials.json missing!");
  process.exit(1);
}

const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
await doc.useServiceAccountAuth(JSON.parse(fs.readFileSync(credsPath)));
await doc.loadInfo();

const sheet = doc.sheetsByTitle["Posts"];
const logSheet = doc.sheetsByTitle["Logs"];
console.log("✅ Connected to Google Sheets");

// === Setup Scheduler ===
setupScheduler(sheet, logSheet);

// === Routes ===
app.get("/", (req, res) => {
  res.send("🚀 Converge Autopost Bot is running successfully!");
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));