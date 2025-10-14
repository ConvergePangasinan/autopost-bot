// ===============================================
// 🧾 Logging Utility
// Version: v3.4.1
// ===============================================

export function logMessage(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}