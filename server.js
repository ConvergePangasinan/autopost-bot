// ===============================================
// 🚀 Converge AutoPost Bot Server
// Version: v3.6.0 (Preview Fix + Random Post)
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
let sheetDoc;
async function connectSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
    await doc.loadInfo();
    sheetDoc = doc;
    logMessage(`📄 Connected to Google Sheet: ${doc.title}`);
    return doc;
  } catch (err) {
    logMessage("⚠️ Failed to connect to Google Sheet");
    console.error(err);
  }
}

// ================================
// 🧠 Routes
// ================================
app.get("/", (req, res) => {
  res.send("🚀 Converge AutoPost Bot Server running successfully...");
});

// Fetch a random post from the "Posts" sheet
app.get("/api/random-post", async (req, res) => {
  try {
    if (!sheetDoc) await connectSheet();
    const sheet = sheetDoc.sheetsByTitle["Posts"];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const posts = rows
      .map(r => ({
        id: r.ID,
        pageName: r.Page_Name,
        message: r.Message,
        imageUrl: r.Image_URL,
        status: r.Status
      }))
      .filter(p => p.message && p.status.toLowerCase() === "pending");

    if (!posts.length) return res.json({ message: "No pending posts found" });

    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    res.json(randomPost);
  } catch (err) {
    console.error("❌ Error fetching random post:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Serve the preview HTML
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/preview", express.static(path.join(__dirname, "facebook-preview.html")));

// ================================
// 🚀 Start Server
// ================================
connectSheet();
scheduleAllTasks();

app.listen(PORT, () => {
  logMessage(`✅ Server running on port ${PORT}`);
});