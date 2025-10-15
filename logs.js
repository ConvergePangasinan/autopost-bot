// ===============================================
// 🧾 Logs Manager - Converge AutoPost Bot
// Version: v3.4.4
// ===============================================

import { connectToSheet } from "./googleSheet.js";

// ✅ Basic console log wrapper
export function logMessage(message) {
  const timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  const log = `[${timestamp}] ${message}`;
  console.log(log);
  return log;
}

// ✅ Append a new log row in Google Sheet
export async function appendLog(doc, entry) {
  try {
    if (!doc) {
      doc = await connectToSheet();
    }

    const logSheetName = process.env.LOG_SHEET_TAB || "Logs";
    let logSheet = doc.sheetsByTitle[logSheetName];

    // Create the "Logs" sheet if it doesn’t exist
    if (!logSheet) {
      logMessage("⚙️ 'Logs' sheet not found, creating one...");
      logSheet = await doc.addSheet({
        title: logSheetName,
        headerValues: ["Timestamp", "Status", "Message"],
      });
    }

    // Append the log row
    await logSheet.addRow({
      Timestamp: entry.timestamp || new Date().toISOString(),
      Status: entry.status || "Info",
      Message: entry.message || "",
    });

    logMessage(`📝 Log appended: ${entry.status || "Info"} - ${entry.message}`);
  } catch (err) {
    console.error("❌ Failed to append log:", err.message);
  }
}