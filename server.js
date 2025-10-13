import express from "express";
import axios from "axios";
import cron from "node-cron";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();
const app = express();
app.use(express.json());

/**
 * AutoPost Bot v2 - Final
 * - 2 posts every 3 hours (1 ready, 1 reserve)
 * - Post every 4 hours
 * - Random English/Taglish
 * - CTA link appended
 * - Logs to Google Sheets (weekly tabs)
 * - Endpoints: /health, /ping, /generate, /post, /status, /logs
 * - Internal keepalive cron every 10 minutes (pings SELF_URL)
 */

const TZ = process.env.TIMEZONE || "Asia/Manila";
const CTA_LINK = process.env.CTA_LINK || "https://convergepangasinan.github.io/BidaFiberX/";
const SHEET_MAIN_TAB = process.env.SHEET_MAIN_TAB || "Post";
const LOGS_TAB = process.env.LOGS_TAB || "Logs";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_KEY = process.env.HUGGINGFACE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_KEY = process.env.GOOGLE_SERVICE_KEY ? JSON.parse(process.env.GOOGLE_SERVICE_KEY) : null;
const SELF_URL = process.env.SELF_URL || ""; // e.g. https://autopost-bot-m222.onrender.com

if (!SHEET_ID || !GOOGLE_SERVICE_KEY) {
  console.warn("⚠️ Google Sheets credentials missing. Set GOOGLE_SHEET_ID and GOOGLE_SERVICE_KEY");
}

const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_SERVICE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });

function getWeekTabName(d = new Date()) {
  const year = d.getFullYear();
  const diff = Math.ceil((((d - new Date(year,0,1)) / 86400000) + new Date(year,0,1).getDay()+1)/7);
  return `Week_${year}_${diff}`;
}

async function ensureTabExists(title) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existing = meta.data.sheets.map(s => s.properties.title);
    if (!existing.includes(title)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title } } }]
        }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${title}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[ "Timestamp", "Caption", "ImageDataOrURL", "Status", "Type", "Notes" ]]
        }
      });
    }
    return title;
  } catch (err) {
    console.error("ensureTabExists error:", err.response?.data || err.message || err);
    throw err;
  }
}

async function appendRow(tab, row) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A:F`,
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });
  } catch (err) {
    console.error("appendRow error:", err.response?.data || err.message || err);
  }
}

async function readRecentCaptions(limit = 200) {
  try {
    const tab = await ensureTabExists(getWeekTabName());
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A2:B${limit+1}`
    });
    const rows = res.data.values || [];
    return rows.map(r => (r[1]||"").slice(0,300));
  } catch (err) {
    console.error("readRecentCaptions error:", err.message || err);
    return [];
  }
}

function cleanText(s) {
  return (s||"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").trim();
}

function isSimilar(a,b) {
  if(!a||!b) return false;
  const A = cleanText(a).split(/\s+/);
  const B = cleanText(b).split(/\s+/);
  const common = A.filter(x => B.includes(x));
  return (common.length / Math.max(A.length, B.length)) > 0.6;
}

async function callGemini(prompt) {
  try {
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-mini:generateContent?key=${GEMINI_KEY}`,
      payload,
      { timeout: 30000 }
    );
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch (err) {
    console.error("Gemini error:", err.response?.data || err.message);
    return null;
  }
}

async function callHuggingFace(prompt) {
  try {
    const hfUrl = process.env.HUGGINGFACE_MODEL_URL || "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2";
    const res = await axios.post(hfUrl, { inputs: prompt }, { headers: { Authorization: `Bearer ${HUGGINGFACE_KEY}` }, responseType: "arraybuffer", timeout: 120000 });
    const base64 = Buffer.from(res.data).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("HuggingFace error:", err.response?.data || err.message);
    return null;
  }
}

async function generateCaptionWithCTA(topic, tone="english") {
  const prompt = tone === "taglish"
    ? `Write a short Taglish Facebook ad about ${topic}. Friendly, include emojis and a CTA line at the end: Apply here: ${CTA_LINK}`
    : `Write a short English Facebook ad about ${topic}. Friendly, include emojis and a CTA line at the end: Apply here: ${CTA_LINK}`;
  const out = await callGemini(prompt);
  if (!out) return `${topic} — Apply here: ${CTA_LINK}`;
  return out.includes(CTA_LINK) ? out : `${out}\n\n📲 Apply here: ${CTA_LINK}`;
}

async function createTwoPosts() {
  const topics = [
    "Converge Bida Plan 888 - affordable home fiber",
    "Converge Bida Plan 999 - fast home fiber",
    "Converge FiberX - high speed internet",
    "Converge Super Bundle with Sky TV and Netflix",
    "Converge for small business reliability"
  ];
  const recent = await readRecentCaptions(200);
  const results = [];
  for (let i=0;i<2;i++){
    const tone = Math.random() < 0.5 ? "taglish" : "english";
    let caption = null;
    let attempts = 0;
    while(attempts < 6 && !caption){
      attempts++;
      const topic = topics[Math.floor(Math.random()*topics.length)];
      const candidate = await generateCaptionWithCTA(topic, tone);
      const dup = recent.some(r => isSimilar(r, candidate));
      if (!dup) caption = candidate;
    }
    if (!caption) caption = `Converge — Apply here: ${CTA_LINK}`;
    const imgPrompt = caption.slice(0,180) + " promotional poster, clean branding, high quality";
    const imageData = await callHuggingFace(imgPrompt);
    const type = i===0 ? "ready" : "reserve";
    results.push([new Date().toLocaleString("en-PH",{timeZone:TZ}), caption, imageData||"", "pending", type, ""]);
  }
  const tab = await ensureTabExists(getWeekTabName());
  for (const r of results) await appendRow(tab, r);
  console.log(`Saved ${results.length} posts to ${tab}`);
  return results;
}

async function findNextPost() {
  const tab = await ensureTabExists(getWeekTabName());
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A2:F500` });
  const rows = res.data.values || [];
  for (let i=0;i<rows.length;i++){
    const [ts, caption, image, status, type] = rows[i];
    if ((status||"").toLowerCase()==="pending" && (type||"").toLowerCase()==="ready") {
      return { index: i+2, row: rows[i], tab };
    }
  }
  for (let i=0;i<rows.length;i++){
    const [ts, caption, image, status, type] = rows[i];
    if ((status||"").toLowerCase()==="pending" && (type||"").toLowerCase()==="reserve") {
      return { index: i+2, row: rows[i], tab };
    }
  }
  return null;
}

async function postToFacebook(caption, imageData) {
  try {
    const res = await axios.post(`https://graph.facebook.com/${FACEBOOK_PAGE_ID}/photos`, {
      caption,
      url: imageData,
      access_token: FACEBOOK_ACCESS_TOKEN
    });
    return res.data;
  } catch (err) {
    console.error("Facebook post error:", err.response?.data || err.message);
    throw err;
  }
}

async function moveToLogs(tab, rowIndex, caption, image, fbResult) {
  try {
    await appendRow(LOGS_TAB, [ new Date().toLocaleString("en-PH",{timeZone:TZ}), caption, image||"", fbResult?.post_id || fbResult?.id || "", "Success" ]);
    // delete the row from week tab
    const sheetmeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheetObj = sheetmeta.data.sheets.find(s=>s.properties.title===tab);
    const sheetIdNum = sheetObj.properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId: sheetIdNum, dimension: "ROWS", startIndex: rowIndex-1, endIndex: rowIndex }
          }
        }]
      }
    });
  } catch (err) {
    console.error("moveToLogs error:", err.response?.data || err.message);
  }
}

async function logFailure(info) {
  try {
    await appendRow(LOGS_TAB, [ new Date().toLocaleString("en-PH",{timeZone:TZ}), info.caption||"", info.image||"", "Failure", info.error||"" ]);
  } catch (err) {
    console.error("logFailure error:", err.message || err);
  }
}

async function performPostingOnce() {
  try {
    const next = await findNextPost();
    if (!next) {
      console.log("No ready/reserve posts - generating two now");
      await createTwoPosts();
      return;
    }
    const { index, row, tab } = next;
    const caption = row[1] || `Apply here: ${CTA_LINK}`;
    const image = row[2] || "";
    try {
      const fb = await postToFacebook(caption, image);
      console.log("Posted to FB:", fb);
      await moveToLogs(tab, index, caption, image, fb);
    } catch (err) {
      console.error("Posting failed:", err.message || err);
      await logFailure({ caption, image, error: err.response?.data || err.message });
    }
  } catch (err) {
    console.error("performPostingOnce error:", err.message || err);
  }
}

// SCHEDULES
// Every 3 hours generate 2 posts
cron.schedule("0 */3 * * *", async () => {
  console.log("Cron: generate two posts");
  await createTwoPosts();
}, { timezone: TZ });

// Every 4 hours post once
cron.schedule("0 */4 * * *", async () => {
  console.log("Cron: perform posting");
  await performPostingOnce();
}, { timezone: TZ });

// Internal keepalive: ping SELF_URL every 10 minutes (if configured)
cron.schedule("*/10 * * * *", async () => {
  try {
    if (SELF_URL) {
      await axios.get(SELF_URL + "/ping", { timeout: 10000 });
      console.log("Keepalive ping to SELF_URL successful");
    } else {
      console.log("Keepalive: SELF_URL not set, skipping");
    }
  } catch (err) {
    console.error("Keepalive ping failed:", err.message || err);
  }
}, { timezone: TZ });

// Endpoints
app.get("/ping", (req,res) => res.json({ ok:true, time: new Date().toISOString() }));
app.get("/health", (req,res) => res.json({ status:"ok", time: new Date().toISOString() }));
app.get("/generate", async (req,res) => {
  try {
    const created = await createTwoPosts();
    res.json({ ok:true, created });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});
app.get("/post", async (req,res) => {
  try {
    await performPostingOnce();
    res.json({ ok:true, message:"Posted (or queued) - check Logs" });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});
app.get("/status", async (req,res) => {
  try {
    const next = await findNextPost();
    res.json({ ok:true, next: next ? { index: next.index, captionPreview: (next.row[1]||"").slice(0,160) } : null });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});
app.get("/logs", async (req,res) => {
  try {
    const logs = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${LOGS_TAB}!A:F` });
    res.json(logs.data.values || []);
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Autopost bot running on port ${PORT}`));