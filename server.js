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

app.use(cors());
app.use(bodyParser.json());

// ✅ Load Google credentials from .env
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_JSON);
  logMessage("✅ Loaded Google credentials from .env");
} catch (err) {
  logMessage("❌ Failed to parse GOOGLE_SERVICE_JSON");
  console.error(err);
  process.exit(1);
}

// ✅ Google Auth setup
const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Example: Connect to Google Sheet
async function connectSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
    await doc.loadInfo();
    logMessage(`📄 Connected to Google Sheet: ${doc.title}`);
  } catch (err) {
    logMessage("⚠️ Failed to connect to Google Sheet");
    console.error(err);
  }
}

connectSheet();
scheduleAllTasks();

app.get("/", (req, res) => {
  res.send("🚀 Converge AutoPost Bot Server running...");
});

app.listen(PORT, () => {
  logMessage(`✅ Server running on port ${PORT}`);
});