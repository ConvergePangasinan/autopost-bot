// ===============================================
// 🚀 Converge AutoPost Bot Server (v3.8.0)
// Author: Edward John Paulo
// Features: Case-insensitive Pending Fix + Responsive Preview Page
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

let doc; // Google Sheet connection

// ===============================================
// 🔐 Google Credentials Setup
// ===============================================
let serviceAccount;
try {
  if (!process.env.GOOGLE_CREDENTIALS)
    throw new Error("Missing GOOGLE_CREDENTIALS in .env");

  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage("✅ GOOGLE_CREDENTIALS loaded successfully.");
} catch (err) {
  console.error("❌ Failed to parse GOOGLE_CREDENTIALS:", err);
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
    console.log(`📄 Connected to Google Sheet: ${doc.title}`);
  } catch (err) {
    console.error("⚠️ Failed to connect to Google Sheet:", err);
  }
}

// Connect once and schedule background tasks
connectSheet();
scheduleAllTasks();

// ===============================================
// 🧠 Root Test Route
// ===============================================
app.get("/", (req, res) => {
  res.send(`
    <div style="text-align:center;margin-top:40px;">
      <h2>🚀 Converge AutoPost Bot Server</h2>
      <p>Server running successfully...</p>
      <a href="/preview" style="padding:10px 20px;background:#007bff;color:#fff;border-radius:6px;text-decoration:none;">Open Preview Page</a>
    </div>
  `);
});

// ===============================================
// ✅ Responsive Preview Page Route
// ===============================================
app.get("/preview", async (req, res) => {
  try {
    if (!doc) await connectSheet();
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Posts"];
    if (!sheet) return res.status(404).send("❌ 'Posts' tab not found.");

    const rows = await sheet.getRows();
    console.log("📊 Total rows found:", rows.length);

    // Fix for hidden Unicode and invisible spaces
    const normalizeText = (text) =>
      String(text || "")
        .normalize("NFKC") // normalize Unicode
        .replace(/[^\x20-\x7E]+/g, "") // remove non-visible chars
        .trim()
        .toLowerCase();

    const pendingPosts = rows.filter((r) => normalizeText(r.Status) === "pending");

    console.log("✅ Pending posts found:", pendingPosts.length);

    if (pendingPosts.length === 0) {
      return res.send(`
        <style>
          body {font-family:Poppins, sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f2f4f8;margin:0;}
          .card {background:#fff;padding:30px 40px;border-radius:16px;box-shadow:0 4px 10px rgba(0,0,0,0.1);text-align:center;}
          button {padding:10px 20px;background:#007bff;color:#fff;border:none;border-radius:6px;cursor:pointer;}
        </style>
        <div class="card">
          <h3>My Page</h3>
          <p>No pending posts found</p>
          <a href="/preview"><button>Next Random Post</button></a>
        </div>
      `);
    }

    const randomPost = pendingPosts[Math.floor(Math.random() * pendingPosts.length)];

    // Responsive HTML
    res.send(`
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #f0f2f5, #d9e4ff);
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .card {
          background: #fff;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          width: 90%;
          max-width: 420px;
          text-align: center;
        }
        .card img {
          width: 100%;
          border-radius: 12px;
          margin: 10px 0;
        }
        .btn {
          display: inline-block;
          padding: 10px 16px;
          background: #007bff;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          margin-top: 12px;
        }
        @media (max-width: 480px) {
          .card { padding: 15px; }
          .btn { padding: 8px 14px; }
        }
      </style>
      <div class="card">
        <h3>${randomPost.Page_Name || "Unnamed Page"}</h3>
        <p>${randomPost.Message || "(No message provided)"}</p>
        ${
          randomPost.Image_URL
            ? `<img src="${randomPost.Image_URL}" alt="Preview Image" />`
            : `<div style="color:#777;">No image available</div>`
        }
        <p><b>Schedule:</b> ${randomPost.Scheduled_Time || "Not set"}</p>
        <a href="/preview" class="btn">Next Random Post</a>
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
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));