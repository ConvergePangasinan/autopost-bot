// ===============================================
// 🧾 Logs Dashboard Route
// ===============================================
export function registerLogsRoute(app, doc) {
  app.get("/logs", async (req, res) => {
    try {
      await doc.loadInfo();
      const logSheet = doc.sheetsByTitle["Logs"];
      if (!logSheet) return res.status(404).send("Logs sheet not found");

      const rows = await logSheet.getRows();
      const recent = rows.slice(-10).reverse();

      const htmlRows = recent
        .map(
          (r) => `
        <tr>
          <td>${r.Timestamp || ""}</td>
          <td>${r.Caption || ""}</td>
          <td>${r.Status || ""}</td>
          <td>${r.Source || ""}</td>
          <td>${r.Error || ""}</td>
        </tr>`
        )
        .join("");

      res.send(`
        <html>
        <head>
          <title>Logs Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; background:#fafafa; padding:20px; }
            h2 { color:#2d2d2d; }
            table { width:100%; border-collapse:collapse; margin-top:15px; }
            th, td { border:1px solid #ddd; padding:8px; text-align:left; }
            th { background:#4CAF50; color:white; }
            tr:nth-child(even) { background:#f2f2f2; }
          </style>
        </head>
        <body>
          <h2>🧾 Recent Logs (Last 10)</h2>
          <table>
            <tr><th>Timestamp</th><th>Caption</th><th>Status</th><th>Source</th><th>Error</th></tr>
            ${htmlRows}
          </table>
        </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send("Error loading logs: " + err.message);
    }
  });
}