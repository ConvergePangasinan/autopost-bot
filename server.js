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

// Load Google credentials
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage("✅ Loaded GOOGLE_CREDENTIALS");
} catch (err) {
  console.error("❌ GOOGLE_CREDENTIALS parse error:", err);
  process.exit(1);
}

const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Connect to sheet
async function connectSheet(force = false) {
  if (doc && !force) return doc;
  doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
  await doc.loadInfo();
  logMessage(`📄 Connected to sheet: ${doc.title}`);
  return doc;
}

// Normalize a string (lowercase + remove whitespace + remove invisible)
function normalizeStr(str) {
  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "")        // remove spaces
    .replace(/\u00a0/g, "")     // non-breaking space
    .replace(/[\u200B-\u200D]/g, "") // zero-width spaces
    .trim();
}

// Find the key (column name) in a row object that best matches “status”
function findStatusKey(row) {
  const keys = Object.keys(row);
  for (let k of keys) {
    const norm = normalizeStr(k);
    if (norm === "status" || norm.includes("status")) {
      return k;
    }
  }
  return null;
}

// API for JSON
app.get("/api/random-post", async (req, res) => {
  try {
    const doc = await connectSheet(true);
    const sheet = doc.sheetsByTitle["Posts"];
    const rows = await sheet.getRows();

    console.log("📊 Total rows:", rows.length);
    // Debug: show raw keys of row 1
    if (rows.length > 0) {
      console.log("Row 1 keys:", Object.keys(rows[0]));
    }

    const pending = rows.filter((row, idx) => {
      const key = findStatusKey(row);
      const val = key ? row[key] : undefined;
      console.log(`Row ${idx + 1} statusKey:`, key, "value:", JSON.stringify(val));
      return val && normalizeStr(val).includes("pending");
    });

    console.log("✅ Pending count:", pending.length);

    if (pending.length === 0) {
      return res.json({ message: "No pending posts found." });
    }

    const post = pending[Math.floor(Math.random() * pending.length)];

    res.json({
      Page_Name: post.Page_Name,
      Message: post.Message,
      Image_URL: post.Image_URL,
      Scheduled_Time: post.Scheduled_Time,
      Status: post[findStatusKey(post)],
    });
  } catch (err) {
    console.error("❌ /api/random-post error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bootstrap HTML preview
app.get("/preview", async (req, res) => {
  try {
    const doc = await connectSheet(true);
    const sheet = doc.sheetsByTitle["Posts"];
    const rows = await sheet.getRows();

    const pending = rows.filter((row, idx) => {
      const key = findStatusKey(row);
      const val = key ? row[key] : undefined;
      return val && normalizeStr(val).includes("pending");
    });

    if (pending.length === 0) {
      return res.send(`
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <div class="container text-center mt-5">
          <div class="alert alert-warning shadow">
            <h4>No Pending Posts Found</h4>
            <a href="/preview" class="btn btn-primary mt-3">Reload</a>
          </div>
        </div>
      `);
    }

    const post = pending[Math.floor(Math.random() * pending.length)];
    const statusKey = findStatusKey(post);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Preview</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
      </head>
      <body class="bg-light text-center py-5">
        <div class="container">
          <div class="card shadow mx-auto" style="max-width:400px;">
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
    console.error("❌ /preview error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/facebook-preview", (req, res) => {
  res.sendFile(path.join(__dirname, "facebook-preview.html"));
});

app.get("/", (req, res) => {
  res.send(`
    <div style="text-align:center;margin-top:40px;">
      <h2>🚀 AutoPost Bot</h2>
      <a href="/preview">Preview</a> |
      <a href="/facebook-preview">Facebook Preview</a> |
      <a href="/api/random-post">JSON API</a>
    </div>
  `);
});

app.listen(PORT, () => {
  logMessage(`✅ Server listening on port ${PORT}`);
});