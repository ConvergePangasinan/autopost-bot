// ===============================================
// 🕓 Scheduler - Converge AutoPost Bot
// Version: v3.4.2 (no src folder)
// ===============================================

import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { appendLog, logMessage } from "./logs.js";

// Load environment variables
const SHEET_ID = process.env.SHEET_ID;

// ✅ Load Google credentials from .env
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_JSON);
  logMessage("✅ Scheduler loaded Google credentials successfully");
} catch (err) {
  logMessage("❌ Scheduler failed to parse GOOGLE_SERVICE_JSON");
  console.error(err);
  process.exit(1);
}

// ✅ Google Auth setup
const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Initialize Google Sheet connection
let doc;
async function initSheet() {
  try {
    doc = new GoogleSpreadsheet(SHEET_ID, serviceAuth);
    await doc.loadInfo();
    logMessage(`📄 Scheduler connected to Google Sheet: ${doc.title}`);
  } catch (err) {
    logMessage("⚠️ Scheduler failed to connect to Google Sheet");
    console.error(err);
  }
}

// ✅ Example posting function
async function postScheduledTasks() {
  try {
    const sheet = doc.sheetsByTitle["Posts"];
    if (!sheet) {
      logMessage("⚠️ 'Posts' sheet not found in Google Sheets");
      return;
    }

    await sheet.loadCells();
    logMessage("🔄 Scheduler checked for due posts");

    // Example log entry
    await appendLog(doc, {
      timestamp: new Date().toISOString(),
      status: "Running",
      message: "Scheduler executed successfully",
    });
  } catch (err) {
    logMessage(`❌ Error running scheduled task: ${err.message}`);
  }
}

// ✅ Schedule all recurring tasks
export function scheduleAllTasks() {
  initSheet();

  // Runs every 15 minutes (adjust as needed)
  cron.schedule("*/15 * * * *", async () => {
    logMessage("🕓 Running scheduled post task...");
    await postScheduledTasks();
  });

  logMessage("✅ Scheduler initialized (every 15 minutes)");
}