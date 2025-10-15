// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.9.0 (Force Header Reload + Pending Detection Fix)
// Author: Edward John Paulo
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
// 🔐 GOOGLE AUTH
// ===============================================
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage("✅ Loaded GOOGLE_CREDENTIALS from .env");
} catch (err) {
  console.error("❌ Failed to parse GOOGLE_CREDENTIALS", err);
  process.exit(1);
}

const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===============================================
// 📊 CONNECT TO GOOGLE SHEET
// ===============================================
async function connectSheet(force = false) {
  if (doc && !force) return doc;
  doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
  await doc.loadInfo();
  logMessage(`📄 Connected to Google Sheet: ${doc.title}`);
  return doc;
}

await connectSheet();
scheduleAllTasks();

// ===============================================
// 🧩 HELPER — Normalize text
// ===============================================
function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\u00a0/g, "")
    .replace(/[\u200B-\u200D]/g, "")
    .trim();
}

// ===============================================
// 🧠 ROOT
// ===============================================
app.get("/", (req, res) =>
  res.send(`
    <div style="text-align:center;margin-top:40px;">
      <h2>🚀 Converge AutoPost Bot</h2>
      <p>Welcome, Master Edward!</p>
      <a href="/preview" style="padding:8px 14px;background:#007bff;color:white;border-radius:8px;text-decoration:none;">Open Preview</a>
      <br><br>
      <a href="/facebook-preview" style="padding:8px 14px;background:#1877f2;color:white;border-radius:8px;text-decoration:none;">Facebook Preview UI</a>
    </div>
  `)
);

// ===============================================
// 📡 /api/random-post
// ===============================================
app.get("/api/random-post", async (req, res) => {
  try {
    const doc = await connectSheet(true);
    const sheet = doc.sheetsByTitle["Posts"];
    await sheet.loadHeaderRow(); // ⚡ Force refresh header
    const rows = await sheet.getRows();

    console.log("📊 Total rows:", rows.length);

    const pending = rows.filter((r, i) => {
      const keys = Object.keys(r);
      const key = keys.find(k => normalize(k).includes("status"));
      const val = key ? r[key] : "";
      console.log(`Row ${i + 1}: key="${key}" val="${val}"`);
      return val && normalize(val) === "pending";
    });

    console.log("✅ Pending count:", pending.length);

    if (!pending.length) return res.json({ message: "No pending posts found." });

    const post = pending[Math.floor(Math.random() * pending.length)];

    res.json({
      Page_Name: post.Page_Name,
      Message: post.Message,
      Image_URL: post.Image_URL,
      Scheduled_Time: post.Scheduled_Time,
      Status: post.Status,
    });
  } catch (err) {
    console.error("❌ /api/random-post:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// 🌐 /preview (Bootstrap responsive)
// ===============================================
app.get("/preview", async (req, res) => {
  try {
    const doc = await connectSheet(true);
    const sheet = doc.sheetsByTitle["Posts"];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const pending = rows.filter((r) => {
      const keys = Object.keys(r);
      const key = keys.find(k => normalize(k).includes("status"));
      const val = key ? r[key] : "";
      return val && normalize(val) === "pending";
    });

    if (!pending.length) {
      return res.send(`
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <div class="container text-center mt-5">
          <div class="alert alert-warning shadow">
            <h4>No Pending Posts Found</h4>
            <a href="/preview" class="btn btn-primary mt-3">🔁 Reload</a>
          </div>
        </div>
      `);
    }

    const post = pending[Math.floor(Math.random() * pending.length)];

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
            ${post.Image_URL ? `<img src="${post.Image_URL}" class="card-img-top" alt="Preview">` : ""}
            <div class="card-body">
              <h5 class="card-title">${post.Page_Name || ""}</h5>
              <p class="card-text">${post.Message || ""}</p>
              <p class="text-muted"><b>Schedule:</b> ${post.Scheduled_Time || ""}</p>
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
// 🪩 /facebook-preview
// ===============================================
app.get("/facebook-preview", (req, res) => {
  res.sendFile(path.join(__dirname, "facebook-preview.html"));
});

// ===============================================
// 🚀 START SERVER
// ===============================================
app.listen(PORT, () => {
  logMessage(`✅ Server running on port ${PORT}`);
});