// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.5.0 (Root + GOOGLE_CREDENTIALS)
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { scheduleAllTasks } from "./scheduler.js";
import { logMessage } from "./logs.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// 🌐 Middleware
// ================================
app.use(cors());
app.use(bodyParser.json());

// ================================
// 🔐 Load Google Service Credentials
// ================================
let serviceAccount;
try {
  if (!process.env.GOOGLE_CREDENTIALS) throw new Error("Missing GOOGLE_CREDENTIALS in .env");
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage("✅ Loaded GOOGLE_CREDENTIALS from .env");
} catch (err) {
  logMessage("❌ Failed to parse GOOGLE_CREDENTIALS");
  console.error(err);
  process.exit(1);
}

// ================================
// 🔑 Google Auth Setup
// ================================
const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ================================
// 📊 Connect to Google Sheet
// ================================
async function connectSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
    await doc.loadInfo();
    logMessage(`📄 Connected to Google Sheet: ${doc.title}`);
    return doc;
  } catch (err) {
    logMessage("⚠️ Failed to connect to Google Sheet");
    console.error(err);
  }
}

// Initialize sheet connection and start tasks
connectSheet();
scheduleAllTasks();

// ================================
// 🧠 Test Routes
// ================================
app.get("/", (req, res) => {
  res.send("🚀 Converge AutoPost Bot Server running successfully...");
});

app.get("/test-facebook", (req, res) => {
  res.send(`
    <h2>✅ Facebook API Test</h2>
    <p>This route is for testing Facebook post simulation.</p>
    <a href="/preview" target="_blank">Open Facebook Preview</a>
  `);
});

// Serve preview page
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/preview", express.static(path.join(__dirname, "facebook-preview.html")));

// ================================
// 🚀 Start Server
// ================================
app.listen(PORT, () => {
  logMessage(`✅ Server running on port ${PORT}`);
});

// ================================
// 🧾 Logging Helper (For Sheets)
// ================================
export async function appendLog(doc, entry) {
  try {
    const sheet = doc.sheetsByTitle["Logs"];
    if (!sheet) throw new Error("Logs sheet not found");

    await sheet.addRow(entry);
    console.log(`📝 Log added: ${entry.status} - ${entry.message}`);
  } catch (err) {
    console.error("❌ Error writing to Logs sheet:", err.message);
  }
}