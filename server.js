// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.6.4 (Column Auto-Detection Fix)
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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let doc;

// ===============================================
// 🔐 Load Google Service Credentials
// ===============================================
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage("✅ Loaded GOOGLE_CREDENTIALS from .env");
} catch (err) {
  logMessage("❌ Failed to parse GOOGLE_CREDENTIALS");
  console.error(err);
  process.exit(1);
}

const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function connectSheet(force = false) {
  try {
    if (doc && !force) return doc;
    doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
    await doc.loadInfo();
    logMessage(`📄 Connected to Google Sheet: ${doc.title}`);
    return doc;
  } catch (err) {
    logMessage("⚠️ Failed to connect to Google Sheet");
    console.error(err);
  }
}

await connectSheet();
scheduleAllTasks();

// ===============================================
// 🔎 Helper to normalize keys (case-insensitive)
// ===============================================
function normalizeKey(obj, keyName) {
  const keys = Object.keys(obj);
  const normalizedKey = keys.find(
    (k) => k.toLowerCase().trim() === keyName.toLowerCase().trim()
  );
  return normalizedKey ? obj[normalizedKey] : undefined;
}

// ===============================================
// 🧠 Routes
// ===============================================
app.get("/", (req, res) => {
  res.send("🚀 Converge AutoPost Bot Server running successfully...");
});

app.get("/preview-json", async (req, res) => {
  try {
    const doc = await connectSheet(true);
    const sheet = doc.sheetsByTitle["Posts"];
    const rows = await sheet.getRows();

    const pendingPosts = rows.filter((row) => {
      const status = normalizeKey(row, "Status");
      return status && status.toString().toLowerCase().includes("pending");
    });

    res.json({
      totalRows: rows.length,
      pendingCount: pendingPosts.length,
      data: pendingPosts.map((r) => ({
        Page_Name: normalizeKey(r, "Page_Name"),
        Message: normalizeKey(r, "Message"),
        Status: normalizeKey(r, "Status"),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// 🌐 /preview (Bootstrap-friendly)
// ===============================================
app.get("/preview", async (req, res) => {
  try {
    const doc = await connectSheet(true);
    const sheet = doc.sheetsByTitle["Posts"];
    const rows = await sheet.getRows();

    const pendingPosts = rows.filter((row) => {
      const status = normalizeKey(row, "Status");
      return status && status.toString().toLowerCase().includes("pending");
    });

    if (pendingPosts.length === 0) {
      return res.send(`
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <div class="container text-center mt-5">
          <div class="alert alert-warning shadow">
            <h4>No Pending Posts Found</h4>
            <a href="/preview" class="btn btn-primary mt-3">🔁 Try Again</a>
          </div>
        </div>
      `);
    }

    const randomPost =
      pendingPosts[Math.floor(Math.random() * pendingPosts.length)];

    const img = normalizeKey(randomPost, "Image_URL");
    const page = normalizeKey(randomPost, "Page_Name");
    const msg = normalizeKey(randomPost, "Message");
    const sched = normalizeKey(randomPost, "Scheduled_Time");

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Converge Preview</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light text-center py-5">
        <div class="container">
          <div class="card shadow mx-auto" style="max-width: 400px;">
            <img src="${img}" class="card-img-top" alt="Preview Image">
            <div class="card-body">
              <h5 class="card-title">${page}</h5>
              <p class="card-text">${msg}</p>
              <p class="text-muted"><b>Schedule:</b> ${sched}</p>
              <a href="/preview" class="btn btn-primary w-100">Next Random Post</a>
            </div>
          </div>
        </div>
      </body>
      </html>
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