// ===============================================
// 📄 Google Sheet Connection Handler
// ===============================================

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

let doc;

// ✅ Connect to Google Sheet
export const connectToSheet = async () => {
  if (doc) return doc; // Reuse if already connected

  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const sheetId = process.env.SHEET_ID;

  const serviceAccountAuth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  await doc.loadInfo();
  console.log("✅ Connected to Google Sheet:", doc.title);
  return doc;
};

// ✅ Fetch Pending Posts
export const getPendingPosts = async () => {
  const sheet = (await connectToSheet()).sheetsByIndex[0];
  const rows = await sheet.getRows();

  const pending = rows
    .filter((r) => r.Status?.toLowerCase() === "pending")
    .map((r) => ({
      Date: r.Date,
      Time: r.Time,
      Message: r.Message,
      ImageURL: r.ImageURL,
    }));

  console.log(`📋 Pending posts found: ${pending.length}`);
  return pending;
};