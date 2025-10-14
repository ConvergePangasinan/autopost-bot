// ===============================================
// 🧾 Logs Module (v3.4.0)
// Handles logging of post results into Google Sheet
// ===============================================

export async function appendLog(doc, logData) {
  try {
    const logSheet = doc.sheetsByTitle["Logs"];

    if (!logSheet) {
      console.error("❌ 'Logs' sheet not found!");
      return;
    }

    // Prepare row data
    const rowData = {
      Timestamp: logData.timestamp || new Date().toLocaleString("en-PH"),
      Message: logData.message || "",
      Status: logData.status || "Unknown",
      Error: logData.error || "",
    };

    await logSheet.addRow(rowData);
    console.log("🧾 Log added:", rowData.Status, "-", rowData.Message);
  } catch (err) {
    console.error("❌ Failed to append log:", err.message);
  }
}