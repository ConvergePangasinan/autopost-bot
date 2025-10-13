// ===============================================
// 🌐 Ecosystem Config - Converge Autopost Bot
// Version: v3.2.0 (No PM2 Required)
// Updated: Oct 2025
// Author: Edward + Assistant
// Notes: Clean deployment configuration for Render or Node hosting
// ===============================================

export default {
  apps: [
    {
      name: "converge-autopost-bot",
      script: "./server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false, // Keep false for Render
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 5000,
      time: true,
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
        FB_PAGE_ID: process.env.FB_PAGE_ID,
        FB_PAGE_ACCESS_TOKEN: process.env.FB_PAGE_ACCESS_TOKEN,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY
      }
    }
  ]
};