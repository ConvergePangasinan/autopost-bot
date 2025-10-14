// ===============================================
// 📱 Facebook Auto Poster
// Version: v3.4.0 (Stable Manual Mode)
// ===============================================

import axios from "axios";

export async function autoPostToFacebook(message) {
  try {
    const pageId = process.env.FB_PAGE_ID || process.env.PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

    if (!pageId || !token) throw new Error("Missing Facebook credentials");

    const url = `https://graph.facebook.com/${pageId}/feed`;
    const response = await axios.post(url, {
      message,
      access_token: token,
    });

    if (response.data && response.data.id) {
      console.log(`✅ Posted to Facebook — ID: ${response.data.id}`);
      return { success: true, postId: response.data.id };
    } else {
      return {
        success: false,
        error: response.data?.error?.message || "No post ID returned",
      };
    }
  } catch (err) {
    console.error("❌ Facebook posting error:", err.response?.data || err.message);
    return { success: false, error: err.message || String(err) };
  }
}