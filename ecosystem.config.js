// ===============================================
// 🚀 Converge Autopost Bot - Server (NodeJS start only)
// Version: v3.2.0
// Updated: Oct 2025
// Author: Edward + Assistant
// Notes: Runs directly via Node (no PM2). 
// Used for Render, Replit, or bare Node deployments.
// ===============================================

export default {
  name: "converge-autopost-server",
  script: "./server.js",
  interpreter: "node",
  watch: false,
  env: {
    NODE_ENV: "production",
    PORT: 3000,
  },
};