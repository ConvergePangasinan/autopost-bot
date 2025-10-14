// ===============================================
// 🧾 Logging Utility (Save to Logs Sheet)
// Version: v3.4.1
// ===============================================
export async function appendLog(doc, entry) {
  try {
    const sheet = doc.sheetsByTitle["Logs"];
    if (!sheet) throw new Error("Logs sheet not found");

    await sheet.addRow(entry);
    console.log(`📝 Log added: ${entry.status} - ${entry.message}`);
  } catch (err) {
    console.error("❌ Error writing to Logs sheet:", err.message);
  }
}