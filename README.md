# Wyframer

Wyframer is a lightweight browser-based wireframing canvas focused on structure over visual polish. Drag interface primitives onto the canvas, anchor them to common screen sizes, and iterate quickly on user flows.

## Features

- Preset and custom screen sizes to frame your layout.
- Manage multiple screens to map an entire user flow; duplicate or delete as needed.
- Create and switch between multiple projects; snapshots auto-save to your browser.
- Palette of essential components: buttons, inputs, dropdowns, cards, headings, paragraphs, and image placeholders.
- Drag to position, resize with corner handles, double-click to edit copy, and press Delete to remove.
- Copy/paste (Ctrl/Cmd + C/V) or duplicate (Ctrl/Cmd + D) existing elements to work faster.
- 16px snap grid with lightweight rulers keeps layouts aligned.
- Link elements to other screens and launch an interactive preview to simulate the flow.
- Optional Google Sheets & Drive export powered by a user-provided Google Apps Script endpoint.
- Quick help modal for interaction tips without stealing workspace real estate.

## Getting Started

Open `index.html` in any modern browser. No build step required.

## Project Workspaces

- Use the project selector in the top bar to manage as many wireframing workspaces as you need.
- Projects auto-save in `localStorage`; switch between them without losing edits.
- Delete projects when they are no longer required (Wyframer keeps at least one project at all times).

## Saving to Google Sheets

Wyframer ships without server-side storage. To persist data in Google Sheets or Drive without user login, supply a Google Apps Script web app that accepts POSTed JSON.

1. Create or open a Google Sheet that will collect project snapshots.
2. From the sheet, open **Extensions → Apps Script** and paste the script below.
3. Update the default spreadsheet ID (or rely on the ID sent from Wyframer), then deploy the script as a **Web App** with access set to **Anyone**.
4. In Wyframer, click the gear icon next to **Save to Sheets**, paste the deployed Web App URL, and (optionally) provide the spreadsheet ID, sheet/tab name, and a Drive folder ID for JSON exports.
5. Use **Save to Sheets** whenever you want to push the active project snapshot to your Sheet and/or Drive.

```javascript
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const project = payload.project;
  const exportedAt = payload.exportedAt || new Date().toISOString();

  // Fall back to a hard-coded sheet if Wyframer doesn't send one.
  const spreadsheetId = payload.spreadsheetId || 'YOUR_SPREADSHEET_ID';
  const sheetName = payload.sheetName || 'WyframerProjects';

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.appendRow([
    new Date(),
    payload.projectId,
    payload.projectName || 'Untitled project',
    exportedAt,
    JSON.stringify(project)
  ]);

  if (payload.driveFolderId) {
    const folder = DriveApp.getFolderById(payload.driveFolderId);
    const fileName = `${payload.projectName || payload.projectId}-${exportedAt}.json`;
    folder.createFile(fileName, JSON.stringify(project, null, 2), MimeType.JSON);
  }

  return buildCorsResponse({ ok: true });
}

function doGet() {
  return buildCorsResponse({ ok: true });
}

function buildCorsResponse(payload) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  return output;
}
```

The JSON object contains:

- `projectId` / `projectName`: the Wyframer project metadata.
- `exportedAt`: ISO timestamp of the export.
- `project`: full project snapshot including screens, dimensions, and wiring.

> :warning: Anyone with the Apps Script URL can write to your Sheet. Consider limiting access with Google accounts if you need additional safety controls.

After editing the script, make sure to **Deploy → Manage deployments → Edit → Deploy** again so the changes go live.
