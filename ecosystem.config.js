// ===============================================
// ⚙️ PM2 Ecosystem Config (Render Compatible)
// Version: v3.3.3 (auto-synced)
// ===============================================

export default {
  apps: [
    {
      name: "converge-autopost-bot",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};