// ===============================================
// 📄 Google Sheets Connection + Pending Post Loader
// Version: v3.4.2
// ===============================================

import dotenv from "dotenv";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

dotenv.config();

// 🔹 Connect to the Google Sheet
export async function connectToSheet() {
  try {
    if (!process.env.GOOGLE_CREDENTIALS)
      throw new Error("Missing GOOGLE_CREDENTIALS in environment");

    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log("✅ Connected to Google Sheet:", doc.title);
    return doc;
  } catch (err) {
    console.error("❌ Google Sheets connection error:", err.message);
    throw err;
  }
}

// 🔹 Get all pending posts
export async function getPendingPosts() {
  try {
    const doc = await connectToSheet();
    const sheetName = process.env.SHEET_TAB || "Posts"; // your tab name
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

    const rows = await sheet.getRows();
    console.log(`📄 Total rows found: ${rows.length}`);

    // Filter only rows with "Pending" status
    const pendingPosts = rows
      .filter((row) => {
        const status = (row.Status || row.status || "").trim().toLowerCase();
        return status === "pending";
      })
      .map((row) => ({
        id: row.ID || "",
        caption: row.Caption || row.caption || "",
        imageUrl: row.ImageURL || row.image_url || "",
        page: row.Page || row.page || "",
        status: row.Status || row.status || "",
      }));

    console.log(`📢 Pending posts found: ${pendingPosts.length}`);
    return pendingPosts;
  } catch (err) {
    console.error("❌ Error fetching pending posts:", err.message);
    return [];
  }
}