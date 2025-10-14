// ===============================================
// 🧾 Google Sheets Log Utility
// ===============================================

export async function appendLog(doc, entry) {
  try {
    const sheet = doc.sheetsByTitle["Logs"];
    if (!sheet) {
      console.error("⚠️ Logs sheet not found!");
      return;
    }

    await sheet.addRow({
      Timestamp: entry.timestamp,
      Message: entry.message,
      Status: entry.status,
      Error: entry.error || "",
    });

    console.log("📝 Log added:", entry.status);
  } catch (err) {
    console.error("❌ Log append error:", err.message);
  }
}