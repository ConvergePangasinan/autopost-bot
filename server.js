// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.6.1 (Root + GOOGLE_CREDENTIALS + Preview + Pending Fix)
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { scheduleAllTasks } from "./scheduler.js";
import { logMessage } from "./logs.js";

// ===============================================
// ⚙️ Basic Setup
// ===============================================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let doc; // will hold the Google Sheet connection

// ===============================================
// 🔐 Load Google Service Credentials
// ===============================================
let serviceAccount;
try {
  if (!process.env.GOOGLE_CREDENTIALS)
    throw new Error("Missing GOOGLE_CREDENTIALS in .env");

  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage("✅ Loaded GOOGLE_CREDENTIALS from .env");
} catch (err) {
  logMessage("❌ Failed to parse GOOGLE_CREDENTIALS");
  console.error(err);
  process.exit(1);
}

// ===============================================
// 🔑 Google Auth Setup
// ===============================================
const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===============================================
// 📊 Connect to Google Sheet
// ===============================================
async function connectSheet() {
  try {
    doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
    await doc.loadInfo();
    logMessage(`📄 Connected to Google Sheet: ${doc.title}`);
    return doc;
  } catch (err) {
    logMessage("⚠️ Failed to connect to Google Sheet");
    console.error(err);
  }
}

// Initialize connection and scheduled tasks
connectSheet();
scheduleAllTasks();

// ===============================================
// 🧠 Basic Routes
// ===============================================
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

// ===============================================
// ✅ PREVIEW / TEST RANDOM POST ROUTE (uses "Posts" tab)
// ===============================================
app.get("/preview", async (req, res) => {
  try {
    console.log("🔍 Connecting to Google Sheets for preview...");

    // Ensure Google Sheet is ready
    if (!doc) await connectSheet();
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Posts"];
    if (!sheet) {
      console.error("❌ 'Posts' tab not found in the sheet.");
      return res.status(404).send("❌ 'Posts' tab not found.");
    }

    // Fetch all rows
    const rows = await sheet.getRows();
    console.log("📊 Total rows found:", rows.length);

    // Debug log for each Status value
    rows.forEach((r, i) => console.log(`Row ${i + 1} Status: [${r.Status}]`));

    // ✅ Fix: Case-insensitive + trims spaces + removes hidden spaces
    const pendingPosts = rows.filter((r) => {
      const status = String(r.Status || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ""); // remove weird hidden spaces
      return status === "pending";
    });

    console.log("✅ Pending posts found:", pendingPosts.length);

    if (pendingPosts.length === 0) {
      console.log("⚠️ No pending posts found.");
      return res.send(`
        <div style="text-align:center;margin-top:40px;">
          <div style="display:inline-block;padding:20px;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <h3>My Page</h3>
            <p>No pending posts found</p>
            <a href="/preview" style="padding:8px 12px;background:#007bff;color:#fff;border-radius:6px;text-decoration:none;">Next Random Post</a>
          </div>
        </div>
      `);
    }

    // Pick a random pending post
    const randomPost = pendingPosts[Math.floor(Math.random() * pendingPosts.length)];

    // Log preview access
    const logSheet = doc.sheetsByTitle["Logs"];
    if (logSheet) {
      await logSheet.addRow({
        Timestamp: new Date().toISOString(),
        Status: "Preview",
        Message: `Viewed random post for ${randomPost.Page_Name}`,
      });
    }

    // Display preview
    res.send(`
      <div style="text-align:center;margin-top:40px;">
        <div style="display:inline-block;padding:20px;background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:350px;">
          <h3>${randomPost.Page_Name}</h3>
          <p>${randomPost.Message}</p>
          <img src="${randomPost.Image_URL}" alt="Preview" style="width:100%;border-radius:10px;margin-bottom:10px;">
          <p><b>Schedule:</b> ${randomPost.Scheduled_Time}</p>
          <a href="/preview" style="padding:8px 12px;background:#007bff;color:#fff;border-radius:6px;text-decoration:none;">Next Random Post</a>
        </div>
      </div>
    `);
  } catch (err) {
    console.error("❌ Error in /preview:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ===============================================
// 🚀 Start Server
// ===============================================
app.listen(PORT, () => {
  logMessage(`✅ Server running on port ${PORT}`);
});

// ===============================================
// 🧾 Logging Helper (For Sheets)
// ===============================================
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