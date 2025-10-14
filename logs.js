export async function logActivity(logSheet, message) {
  try {
    await logSheet.addRow({
      Timestamp: new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
      Message: message,
    });
    console.log("🪵 Log added:", message);
  } catch (err) {
    console.error("❌ Error logging:", err.message);
  }
}