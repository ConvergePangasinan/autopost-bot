# Autopost Bot v2 - Final ZIP

Files:
- server.js
- package.json
- .env.example
- README.md

Deploy to Render:
1. Create a GitHub repo and push files (do NOT commit secrets).
2. In Render, create a Web Service connected to your repo.
3. Add environment variables in Render dashboard; use .env.example as guide.
   - Put the full service account JSON into GOOGLE_SERVICE_KEY (one-line JSON string).
   - Set SELF_URL to your Render URL (e.g., https://autopost-bot-m222.onrender.com).
4. Deploy.
5. Use BetterStack (3 min) and UptimeRobot (5 min) to ping /ping and /health as desired.

Manual endpoints:
- GET /ping
- GET /health
- GET /generate
- GET /post
- GET /status
- GET /logs

Notes:
- Share your Google Sheet with the service account email (editor).
- Facebook token must be a Page Access Token with pages_manage_posts permission.
- If you want, I can create the GitHub repo and push these files for you.