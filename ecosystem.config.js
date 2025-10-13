// ===============================================
// 🚀 Converge Autopost Bot - Render Starter Config
// Version: v3.2.4
// ✅ No PM2 (uses Render's native process manager)
// ===============================================

export default {
  apps: [
    {
      name: "converge-autopost-server",
      script: "server.js",
      // ✅ use native Node
      interpreter: "node",
      // ✅ optional environment
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};