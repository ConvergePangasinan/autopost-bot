// ===============================================
// ⚙️ Converge Autopost Bot - Ecosystem Config
// Version: v3.2.4
// Clean version for Render (no PM2)
// ===============================================

export default {
  apps: [
    {
      name: "converge-autopost-server",
      script: "server.js",
      exec_mode: "fork", // keep as fork mode for local testing
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "test-all",
      script: "src/testAll.js",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};