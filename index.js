// index.js
const express = require("express");
const fetch = require("node-fetch"); // for API calls
const app = express();
const PORT = process.env.PORT || 10000;

// Optional: JSON body parsing
app.use(express.json());

// ✅ Test route to verify your Render app is alive
app.get("/", (req, res) => {
  res.send("🚀 Converge Auto Poster is running successfully on Render!");
});

// ✅ Example endpoint to auto-post to Facebook Page
app.post("/post", async (req, res) => {
  try {
    const PAGE_ID = process.env.PAGE_ID;
    const ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const { message, photoUrl, linkUrl } = req.body;

    if (!message || !photoUrl) {
      return res.status(400).json({ error: "Missing message or photoUrl" });
    }

    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos`;
    const formData = new URLSearchParams();
    formData.append("url", photoUrl);
    formData.append(
      "caption",
      linkUrl ? `${message}\n\nLearn more: ${linkUrl}` : message
    );
    formData.append("access_token", ACCESS_TOKEN);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});