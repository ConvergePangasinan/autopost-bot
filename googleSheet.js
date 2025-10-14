// ===============================================
// 📄 Google Sheet Connection (v3.4.0)
// Handles authentication and connection for Sheets
// ===============================================

import { GoogleSpreadsheet } from "google-spreadsheet";

// ===============================================
// 🔐 Connect to Google Sheet
// ===============================================
export async function connectToSheet() {
  try {
    // Load credentials from environment
    if (!process.env.GOOGLE_CREDENTIALS) {
      throw new Error("Missing GOOGLE_CREDENTIALS in environment variables");
    }

    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    console.log(`✅ Connected to Google Sheet: ${doc.title}`);
    return doc;
  } catch (err) {
    console.error("❌ Failed to connect to Google Sheet:", err.message);
    process.exit(1);
  }
}