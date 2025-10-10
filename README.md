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
- Optional Google Sheets & Drive sync (export & import) powered by a user-provided Google Apps Script endpoint.
- Quick help modal for interaction tips without stealing workspace real estate.

## Getting Started

Open `index.html` in any modern browser. No build step required.

## Project Workspaces

- Use the project selector in the top bar to manage as many wireframing workspaces as you need.
- Projects auto-save in `localStorage`; switch between them without losing edits.
- Delete projects when they are no longer required (Wyframer keeps at least one project at all times).

## Syncing with Google Sheets

Wyframer ships without server-side storage. To persist or restore data with Google Sheets (and optionally Drive), supply a Google Apps Script web app that accepts JSON requests from Wyframer.

1. Create or open a Google Sheet that will collect project snapshots.
2. From the sheet, open **Extensions > Apps Script** and paste the script below.
3. Update the default Spreadsheet ID (or rely on the ID sent from Wyframer), then deploy the script as a **Web App** with access set to **Anyone**.
4. In Wyframer, click the gear icon next to **Save to Sheets**, paste the deployed Web App URL, and (optionally) provide the Spreadsheet ID, sheet/tab name, and a Drive folder ID for JSON exports. After saving the settings you can use **Save to Sheets** to push the active project and **Load from Sheets** to pull the latest snapshots into your local workspace.

```javascript
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const project = payload.project;
  const exportedAt = payload.exportedAt || new Date().toISOString();

  const spreadsheetId = payload.spreadsheetId || 'YOUR_SPREADSHEET_ID';
  const sheetName = payload.sheetName || 'WyframerProjects';
  const sheet = getOrCreateSheet(spreadsheetId, sheetName);

  sheet.appendRow([
    new Date(),
    payload.projectId || '',
    payload.projectName || 'Untitled project',
    exportedAt,
    JSON.stringify(project)
  ]);

  if (payload.driveFolderId) {
    const folder = DriveApp.getFolderById(payload.driveFolderId);
    const fileName = `${payload.projectName || payload.projectId || 'wyframer'}-${exportedAt}.json`;
    folder.createFile(fileName, JSON.stringify(project, null, 2), MimeType.JSON);
  }

  return buildCorsResponse({ ok: true });
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const mode = params.mode || 'ping';
  const spreadsheetId = params.spreadsheetId || 'YOUR_SPREADSHEET_ID';
  const sheetName = params.sheetName || 'WyframerProjects';
  const projectFilter = params.projectId || '';

  if (mode !== 'projects') {
    return buildCorsResponse({ ok: true });
  }

  const sheet = getOrCreateSheet(spreadsheetId, sheetName);
  const values = sheet.getDataRange().getValues();
  const latestByProject = {};

  values.forEach((row) => {
    if (row.length < 5 || !row[4]) return;
    const rowProjectId = row[1] || '';
    if (projectFilter && rowProjectId !== projectFilter) return;

    let snapshot;
    try {
      snapshot = JSON.parse(row[4]);
    } catch (error) {
      return;
    }

    const exportedAtCell = row[3] || row[0];
    const exportedDate =
      exportedAtCell instanceof Date ? exportedAtCell : new Date(exportedAtCell);
    const exportIso = exportedDate instanceof Date && !isNaN(exportedDate.getTime())
      ? exportedDate.toISOString()
      : new Date().toISOString();
    const key = rowProjectId || `${exportIso}-${row[2]}`;
    const existing = latestByProject[key];

    if (!existing || exportIso >= existing.exportedAt) {
      latestByProject[key] = {
        projectId: rowProjectId,
        projectName: row[2] || (rowProjectId ? `Project ${rowProjectId}` : 'Untitled project'),
        exportedAt: exportIso,
        snapshot
      };
    }
  });

  return buildCorsResponse({ ok: true, items: Object.values(latestByProject) });
}

function doOptions() {
  return buildCorsResponse({ ok: true });
}

function getOrCreateSheet(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function buildCorsResponse(payload) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  return output;
}
```

Wyframer sends and expects the following fields when syncing:

- `projectId` / `projectName`: project metadata used to match and label entries.
- `exportedAt`: ISO timestamp of the snapshot.
- `project`: full project snapshot including screens, hotspots, interaction analytics, and wiring.

Wyframer calls the endpoint with `mode=projects` (and the optional `projectId`) when you click **Load from Sheets**; the script above returns the latest row per project ID so the app can recreate every saved project locally.

> :warning: Anyone with the Apps Script URL can read or write to your Sheet. Consider restricting access to trusted Google accounts if you need additional safety controls.

After editing the script, make sure to **Deploy > Manage deployments > Edit > Deploy** again so the changes go live.
