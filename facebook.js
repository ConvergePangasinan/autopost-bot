const axios = require("axios");
const { google } = require("googleapis");

const FACEBOOK_GRAPH_URL = process.env.FACEBOOK_GRAPH_URL;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Authenticate Google Sheets
function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  return google.sheets({ version: "v4", auth });
}

// Fetch data from the "Posts" tab
async function getPosts() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Posts!A2:H",
  });
  return res.data.values || [];
}

// Update a specific row in Posts sheet
async function updatePostRow(rowIndex, status, errorMessage = "") {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Posts!G${rowIndex}:H${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status, errorMessage]] },
  });
}

// Add log entry to Logs sheet
async function addLog(page, message, status, error = "") {
  const sheets = getSheetsClient();
  const timestamp = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Logs!A:D",
    valueInputOption: "RAW",
    requestBody: { values: [[timestamp, page, status, error || message]] },
  });
}

// Facebook post sender
async function postToFacebook(token, message, imageUrl) {
  const url = `${FACEBOOK_GRAPH_URL}/me/photos`;
  const res = await axios.post(url, null, {
    params: { access_token: token, url: imageUrl, caption: message },
  });
  return res.data;
}

module.exports = { getPosts, updatePostRow, addLog, postToFacebook };