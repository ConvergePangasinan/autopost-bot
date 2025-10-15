// ===============================================
// 📘 Converge AutoPost Bot - Facebook Module
// Version: v3.4.3 (Test Mode - Preview Only)
// ===============================================

import fetch from "node-fetch";
import { logMessage } from "./logs.js";

/**
 * 🧪 TEST MODE FUNCTION
 * -----------------------------------------------
 * Instead of actually posting to Facebook,
 * this function just shows what would be posted.
 * -----------------------------------------------
 * @param {string} message - The post message
 * @param {string} imageUrl - Optional image URL
 * @returns {object} preview result
 */
export async function autoPostToFacebook(message, imageUrl = "") {
  try {
    console.log("========================================");
    console.log("🧪 FACEBOOK POST PREVIEW (NO POST MADE)");
    console.log("========================================");
    console.log("📝 Message:");
    console.log(message);
    if (imageUrl) {
      console.log("🖼️ Image URL:");
      console.log(imageUrl);
    } else {
      console.log("🖼️ No image provided.");
    }
    console.log("========================================");

    // Return simulated success
    return {
      success: true,
      preview: true,
      message: "🧪 Test mode: Post preview only. No data sent to Facebook.",
    };
  } catch (error) {
    console.error("❌ Facebook test error:", error.message);
    logMessage(`❌ Facebook test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 🧾 (Optional) Production Post Function
 * -----------------------------------------------
 * Keep this commented out — used for real posting.
 * Uncomment only when you’re ready for live posting.
 */
/*
export async function autoPostToFacebook(message, imageUrl = "", pageAccessToken) {
  try {
    const url = imageUrl
      ? `https://graph.facebook.com/v20.0/me/photos`
      : `https://graph.facebook.com/v20.0/me/feed`;

    const payload = imageUrl
      ? { url: imageUrl, caption: message, access_token: pageAccessToken }
      : { message, access_token: pageAccessToken };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    logMessage(`✅ Posted to Facebook: ${data.id}`);
    return { success: true, postId: data.id };
  } catch (error) {
    logMessage(`❌ Failed to post to Facebook: ${error.message}`);
    return { success: false, error: error.message };
  }
}
*/