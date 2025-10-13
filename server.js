import express from "express";
import axios from "axios";
import cron from "node-cron";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

/* ✅ UPDATED CONVERGE PLANS (2025)
   Clean and structured by category
*/
const CONVERGE_PLANS = [
  // --- BIDA FIBER PLANS ---
  {
    name: "BIDA Fiber Plan 888",
    speed: "up to 75 Mbps",
    price: "₱888/month",
    devices: "Up to 8 devices",
    features: [
      "Unlimited Internet",
      "Budget-friendly home connection",
      "Perfect for small families or students",
    ],
  },
  {
    name: "BIDA Fiber Plan 999",
    speed: "up to 100 Mbps",
    price: "₱999/month",
    devices: "Up to 8 devices",
    features: [
      "Unlimited Internet with FREE cable",
      "Perfect for streaming and browsing",
      "Reliable for work-from-home setups",
    ],
  },

  // --- NETFLIX BUNDLE PLANS ---
  {
    name: "FiberX + Netflix Plan 1500",
    speed: "up to 200 Mbps",
    price: "₱1,500/month",
    features: [
      "Unlimited Fiber Internet",
      "Includes Netflix Standard Plan",
      "Perfect for HD streaming and binge nights",
    ],
  },
  {
    name: "FiberX + Netflix Plan 2000",
    speed: "up to 400 Mbps",
    price: "₱2,000/month",
    features: [
      "Unlimited Fiber Internet",
      "Includes Netflix Premium Plan (UHD)",
      "Ideal for 4K streaming and smart homes",
    ],
  },

  // --- GAME CHANGER PLANS ---
  {
    name: "Game Changer Plan 1500",
    speed: "up to 300 Mbps",
    price: "₱1,500/month",
    features: [
      "Low latency gaming connection",
      "Prioritized routing for smooth gameplay",
      "Unlimited data – no lag, no limits",
    ],
  },
  {
    name: "Game Changer Plan 2500",
    speed: "up to 600 Mbps",
    price: "₱2,500/month",
    features: [
      "Pro-level gaming internet",
      "Ultra-low ping and optimized routing",
      "Perfect for streaming + competitive play",
    ],
  },

  // --- SUPER FIBERX PLANS ---
  {
    name: "Super FiberX 1500",
    speed: "up to 300 Mbps",
    price: "₱1,500/month",
    features: [
      "Unlimited Fiber Internet",
      "Free Installation and Modem",
      "Wi-Fi 6 Certified Router",
    ],
  },
  {
    name: "Super FiberX 2000",
    speed: "up to 500 Mbps",
    price: "₱2,000/month",
    features: [
      "Unlimited Fiber Internet",
      "Free Installation",
      "Wi-Fi 6 Router + Priority Support",
    ],
  },

  // --- TIME OF DAY PLANS ---
  {
    name: "Day Plan 1500",
    speed: "up to 400 Mbps (Daytime)",
    price: "₱1,500/month",
    features: [
      "High-speed internet from 7AM to 6PM",
      "Perfect for work-from-home professionals",
      "Unlimited data and smooth performance",
    ],
  },
  {
    name: "Night Plan 1500",
    speed: "up to 400 Mbps (Nighttime)",
    price: "₱1,500/month",
    features: [
      "Fast speeds from 6PM to 7AM",
      "Perfect for gamers and night streamers",
      "Unlimited data, no throttling",
    ],
  },
];

/* ✅ GOOGLE SHEETS SETUP */
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

/* ✅ GEMINI CONTENT GENERATOR */
async function generateContent(baseText = "Converge Internet") {
  try {
    const randomLang = Math.random() > 0.5 ? "Taglish" : "English";
    const randomPlan = CONVERGE_PLANS[Math.floor(Math.random() * CONVERGE_PLANS.length)];

    const textPrompt = `
      Create a short, engaging Facebook post in ${randomLang}.
      Topic: ${baseText}
      Highlight plan: ${randomPlan.name} (${randomPlan.speed}, ${randomPlan.price})
      Key features: ${randomPlan.features.join(", ")}.
      Add emojis and a friendly, conversational tone.
      End with this CTA: "Apply here 👉 https://convergepangasinan.github.io/BidaFiberX/"
      Avoid repeating older content. Keep it natural and unique.
    `;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [{ parts: [{ text: textPrompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        params: { key: process.env.GEMINI_API_KEY },
      }
    );

    return (
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Converge Fiber Internet — Fast, reliable, and affordable connection!"
    );
  } catch (error) {
    console.error("Gemini error:", error.response?.data || error.message);
    return "Converge Fiber Internet — Experience the fastest and most reliable connection!";
  }
}

/* ✅ SAVE TO GOOGLE SHEETS */
async function saveToSheet(content, source = "Gemini") {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      Timestamp: new Date().toLocaleString(),
      Source: source,
      Content: content,
    });
    console.log("✅ Saved to Google Sheet");
  } catch (error) {
    console.error("❌ Google Sheets Error:", error.message);
  }
}

/* ✅ FACEBOOK AUTO POST */
async function postToFacebook(content) {
  try {
    const pageId = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;

    const res = await axios.post(`https://graph.facebook.com/${pageId}/feed`, {
      message: content,
      access_token: token,
    });

    console.log("✅ Posted to Facebook:", res.data);
  } catch (error) {
    console.error("❌ Facebook Post Error:", error.response?.data || error.message);
  }
}

/* ✅ AUTO GENERATE & POST */
async function autoGenerateAndPost() {
  console.log("🕒 Generating 2 new contents (every 3 hours)...");
  for (let i = 0; i < 2; i++) {
    const content = await generateContent();
    await saveToSheet(content, "Gemini");
    if (i === 0) {
      await postToFacebook(content);
    } else {
      console.log("💾 Saved as reserve post only.");
    }
  }
}

/* ✅ CRON SCHEDULES */
cron.schedule("0 */3 * * *", autoGenerateAndPost); // every 3 hours

// Self-ping every 10 mins to keep Render alive
cron.schedule("*/10 * * * *", async () => {
  try {
    await axios.get("https://autopost-bot-m222.onrender.com/ping");
    console.log("🔁 Self-ping sent to keep Render awake.");
  } catch (err) {
    console.error("Ping failed:", err.message);
  }
});

/* ✅ ROUTES */
app.get("/", (req, res) => res.send("🚀 Autopost Bot is running fine!"));
app.get("/ping", (req, res) => res.send("✅ OK - Server awake"));
app.get("/health", (req, res) => res.send("✅ Healthy and stable!"));
app.get("/test", async (req, res) => {
  const content = await generateContent("Test Converge Ad");
  res.send({ testContent: content });
});
app.get("/manual-post", async (req, res) => {
  const content = await generateContent("Manual post trigger");
  await postToFacebook(content);
  await saveToSheet(content, "Manual");
  res.send("✅ Manual post sent!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));