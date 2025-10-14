// ===============================================
// 📱 Facebook Auto Poster
// ===============================================

import axios from "axios";

export async function autoPostToFacebook(message) {
  try {
    const pageId = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!pageId || !token) throw new Error("Missing Facebook credentials");

    const url = `https://graph.facebook.com/${pageId}/feed`;
    const response = await axios.post(url, { message, access_token: token });

    if (response.data?.id) {
      console.log("✅ Posted to Facebook:", response.data.id);
      return { success: true, postId: response.data.id };
    } else {
      throw new Error(response.data?.error?.message || "Unknown FB error");
    }
  } catch (err) {
    console.error("❌ Facebook error:", err.message);
    return { success: false, error: err.message };
  }
}