// ===============================================
// 📱 Facebook AutoPost Service
// Version: v3.3.3 (auto-synced)
// ===============================================

import fetch from "node-fetch";
import { VERSION } from "./version.js";

export async function autoPostToFacebook(caption) {
  console.log(`📡 [Facebook ${VERSION.scripts.facebook}] Posting...`);

  try {
    const pageId = process.env.FB_PAGE_ID;
    const token = process.env.FB_ACCESS_TOKEN;

    if (!pageId || !token) throw new Error("Facebook credentials missing!");

    const response = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: caption, access_token: token }),
    });

    const data = await response.json();
    if (data.id) {
      return { success: true, postId: data.id };
    } else {
      throw new Error(data.error?.message || "Unknown Facebook error");
    }
  } catch (err) {
    console.error("❌ Facebook error:", err.message);
    return { success: false, error: err.message };
  }
}