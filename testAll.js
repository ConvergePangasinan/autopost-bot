// ===============================================
// 🧪 Test Routes for All Services (HTML Color Version)
// ===============================================
import fetch from "node-fetch";

export function registerTestRoutes(app, doc, auth, generateAIContent) {
  app.get("/test-all", async (req, res) => {
    const results = [];

    // --- OpenRouter AI Test ---
    try {
      const testAI = await generateAIContent("Quick test for Converge AutoPost Bot AI");
      if (testAI.includes("⚠️"))
        results.push({ service: "OpenRouter AI", status: "⚠️ Partial", color: "#FFD700" });
      else results.push({ service: "OpenRouter AI", status: "✅ Working", color: "#28a745" });
    } catch (e) {
      results.push({ service: "OpenRouter AI", status: "❌ " + e.message, color: "#dc3545" });
    }

    // --- Google Sheets Test ---
    try {
      await doc.loadInfo();
      results.push({
        service: "Google Sheets",
        status: `✅ Connected (${doc.title})`,
        color: "#28a745",
      });
    } catch (e) {
      results.push({ service: "Google Sheets", status: "❌ " + e.message, color: "#dc3545" });
    }

    // --- Facebook Test ---
    try {
      const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
      const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
      const response = await fetch(`https://graph.facebook.com/${pageId}?access_token=${token}`);
      const data = await response.json();

      if (data.name)
        results.push({
          service: "Facebook",
          status: `✅ Connected (${data.name})`,
          color: "#28a745",
        });
      else
        results.push({
          service: "Facebook",
          status: "⚠️ Check credentials or permissions",
          color: "#FFD700",
        });
    } catch (e) {
      results.push({ service: "Facebook", status: "❌ " + e.message, color: "#dc3545" });
    }

    // --- Render Time ---
    const timestamp = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });

    // --- HTML UI ---
    const html = `
      <html>
        <head>
          <title>🚀 Full Diagnostic Report</title>
          <style>
            body {
              font-family: "Poppins", sans-serif;
              background: #f9f9f9;
              color: #222;
              padding: 20px;
              line-height: 1.6;
            }
            h1 {
              color: #007bff;
              text-align: center;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px 15px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #007bff;
              color: white;
            }
            tr:hover {
              background-color: #f1f1f1;
            }
            .status {
              font-weight: bold;
              padding: 5px 10px;
              border-radius: 8px;
            }
            footer {
              margin-top: 25px;
              text-align: center;
              color: #555;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <h1>🚀 Full Diagnostic Report</h1>
          <p><strong>🕒 PH Local Time:</strong> ${timestamp}</p>
          <table>
            <tr><th>Service</th><th>Status</th></tr>
            ${results
              .map(
                (r) => `
              <tr>
                <td>${r.service}</td>
                <td><span class="status" style="color:${r.color}">${r.status}</span></td>
              </tr>
            `
              )
              .join("")}
          </table>
          <footer>✅ AutoPostBot v3.4.0 | Powered by OpenRouter AI</footer>
        </body>
      </html>
    `;

    res.send(html);
  });
}