// ===============================================
// 🚀 Converge AutoPost Bot Server (root)
// Version: v3.5.1 - cleaned + preview + safe startup
// ===============================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { scheduleAllTasks } from "./scheduler.js"; // should accept (doc) or be robust to not having doc
import { logMessage } from "./logs.js"; // should export a logging helper that writes to console or logs sheet

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------
// middleware
// ----------------------------
app.use(cors());
app.use(bodyParser.json());

// ----------------------------
// load GOOGLE_CREDENTIALS from env
// ----------------------------
let serviceAccount;
try {
  if (!process.env.GOOGLE_CREDENTIALS) throw new Error("Missing GOOGLE_CREDENTIALS in .env");
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  logMessage?.("✅ Loaded GOOGLE_CREDENTIALS from .env");
} catch (err) {
  console.error("❌ Invalid GOOGLE_CREDENTIALS:", err.message);
  // Fail fast — we need credentials to run scheduler and Sheets features
  process.exit(1);
}

// ----------------------------
// google auth helper (JWT)
// ----------------------------
const serviceAuth = new JWT({
  email: serviceAccount.client_email,
  key: (serviceAccount.private_key || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ----------------------------
// connect to Google Sheet
// returns GoogleSpreadsheet doc
// ----------------------------
export async function connectSheet() {
  try {
    if (!process.env.SHEET_ID) throw new Error("Missing SHEET_ID in env");
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAuth);
    // older google-spreadsheet versions used useServiceAccountAuth; we're using JWT instance passed directly to constructor (works for v4+)
    await doc.loadInfo();
    logMessage?.(`📄 Connected to Google Sheet: ${doc.title}`);
    return doc;
  } catch (err) {
    console.error("❌ Google Sheets connection error:", err.message || err);
    throw err;
  }
}

// ----------------------------
// /test-facebook - simulation route (no real post)
// ----------------------------
app.get("/test-facebook", async (req, res) => {
  try {
    // if you want to preview a row you can pass ?row=1 to pick a specific row index, else picks the first 'Posts' row
    const doc = await connectSheet();
    const sheet = doc.sheetsByTitle?.Posts ?? doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    if (!rows || rows.length === 0) {
      return res.send("⚠️ No rows found in Posts sheet to test.");
    }

    // choose row index (1-based friendly)
    const idx = Math.max(0, (Number(req.query.row) || 1) - 1);
    const row = rows[idx] || rows[0];
    const message = row.Message || row.Content || row.Caption || "No message provided";
    const imageUrl = row.Image_URL || row.Image || "";

    // Build a simple JSON summary — this route intentionally does not post to Facebook
    res.json({
      test: "facebook-simulated",
      message,
      imageUrl,
      samplePreviewUrl: `${req.protocol}://${req.get("host")}/preview?row=${idx + 1}`,
    });
  } catch (err) {
    console.error("/test-facebook error:", err.message || err);
    res.status(500).send("Server error: " + (err.message || err));
  }
});

// ----------------------------
// /preview - renders facebook-like preview HTML (Bootstrap)
// Accepts ?row=N to pick which row from Posts sheet (defaults to first)
// ----------------------------
app.get("/preview", async (req, res) => {
  try {
    const doc = await connectSheet();
    const sheet = doc.sheetsByTitle?.Posts ?? doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    if (!rows || rows.length === 0) {
      return res.send("<p>⚠️ No post rows available in the Posts sheet.</p>");
    }

    const idx = Math.max(0, (Number(req.query.row) || 1) - 1);
    const row = rows[idx] || rows[0];

    const pageName = row.Page_Name || "My Page";
    const message = (row.Message || row.Content || row.Caption || "").replace(/\n/g, "<br/>");
    const imageUrl = row.Image_URL || "";

    // simple Next random button uses JS to pick a random row and reload
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Facebook Preview</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background:#f0f2f5; padding:24px; font-family: Arial, sans-serif; }
    .fb-card { max-width:720px; margin:40px auto; background:#fff; border-radius:8px; box-shadow: 0 2px 6px rgba(0,0,0,.08); }
    .fb-header { display:flex; align-items:center; padding:16px; gap:12px; }
    .avatar { width:48px;height:48px;border-radius:50%; background:#ddd; display:inline-block; }
    .page-name { font-weight:600; }
    .fb-body { padding:0 16px 16px 16px; }
    .fb-image { width:100%; max-height:420px; object-fit:cover; border-bottom-left-radius:8px; border-bottom-right-radius:8px; }
    .floating-btn { position:fixed; right:20px; top:80px; z-index:9999; }
  </style>
</head>
<body>
  <div class="fb-card">
    <div class="fb-header">
      <div class="avatar"></div>
      <div>
        <div class="page-name">${escapeHtml(pageName)}</div>
        <div class="text-muted" style="font-size:12px">Public · just now</div>
      </div>
    </div>

    <div class="fb-body">
      <div class="mb-3">${message || "<span class='text-muted'>No message</span>"}</div>
      ${imageUrl ? `<div><img src="${escapeAttr(imageUrl)}" alt="preview" class="fb-image" /></div>` : ""}
      <div class="mt-3 d-flex gap-3 text-muted" style="font-size:14px; padding:8px 2px;">
        <div>👍 Like</div>
        <div>💬 Comment</div>
        <div>↗️ Share</div>
      </div>
    </div>
  </div>

  <button class="btn btn-primary floating-btn" id="nextBtn">Next Random Post</button>

  <script>
    function randomRow(max) {
      return Math.floor(Math.random() * max) + 1;
    }
    document.getElementById('nextBtn').addEventListener('click', () => {
      const max = ${rows.length};
      const r = randomRow(max);
      const loc = new URL(window.location.href);
      loc.searchParams.set('row', r);
      window.location.href = loc.toString();
    });
  </script>
</body>
</html>
    `.trim();

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("/preview error:", err.message || err);
    res.status(500).send("Server error: " + (err.message || err));
  }
});

// ----------------------------
// Start server only after initial sheet connection and scheduler init
// ----------------------------
(async function init() {
  try {
    const doc = await connectSheet();

    // Scheduler: pass doc so scheduler can read Posts & Logs etc.
    try {
      // If scheduleAllTasks expects doc, pass it. Be tolerant if it doesn't.
      if (scheduleAllTasks.length === 0) {
        // no args expected
        scheduleAllTasks();
      } else {
        scheduleAllTasks(doc);
      }
      logMessage?.("✅ Scheduler initialized");
    } catch (schedErr) {
      console.warn("⚠️ Scheduler start failed (non-fatal):", schedErr?.message || schedErr);
    }

    app.listen(PORT, () => {
      logMessage?.(`✅ Server running on port ${PORT}`);
      console.log(`✅ Converge Autopost Bot listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Fatal startup error — aborting:", err.message || err);
    process.exit(1);
  }
})();

// ----------------------------
// small helpers
// ----------------------------
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(s = "") {
  return String(s)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}