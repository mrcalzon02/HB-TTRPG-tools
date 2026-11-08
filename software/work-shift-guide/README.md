# Work Shift Guide — Blank Edition 1.0.0

A reusable work guide for a new job or position. The distributed application starts with an empty position, procedure, reference library, knowledge check, planner and work history. It retains the original route editor, live shift timer, exception log, sign-off records and monthly planner.

**[Open the app](https://mrcalzon02.github.io/HB-TTRPG-tools/software/work-shift-guide/)** · **[Software catalog](https://mrcalzon02.github.io/HB-TTRPG-tools/software.html#work-shift-guide)**

## Start a new position

1. Open **Position Setup** and enter the new job title, department and site. A guide name is optional. Choose the appropriate schedule time zone; an empty template uses the browser's time zone when configured.
2. Paste source material into the intake notes, or load a plain-text/Markdown file. Notes are retained as source material; the app does not infer or invent duties from them.
3. Use **Edit Work** to enter the new position's areas, tasks and procedure notes. Put one task or note on each line. Add reference material and knowledge questions through position setup or a position JSON import.
4. Review the resulting procedure before using **Start Work**. Use **Shift Planner** for the new schedule and **Settings** for the local sign-off name and site notes.

There is no prefilled employer, employee, job title, shift schedule, task list or workplace reference content. The new edition has its own local browser database and does not read the earlier application's saved work.

## Import and export a position

`position-template.json` is a genuinely empty starting point. Fill its fields, select the JSON file in Position Setup, review the import preview, then apply it. Configuration imports replace the position's current configuration; they are not work-history restores. Imports and edits are disabled while a live shift is active so its recorded work scope stays stable.

The position format is:

```json
{
  "format": "work-shift-guide.position",
  "schemaVersion": 1,
  "position": {
    "jobTitle": "",
    "department": "",
    "guideName": "",
    "site": "",
    "timeZone": "",
    "siteRequirements": "",
    "shelterPlan": ""
  },
  "route": [],
  "references": [],
  "knowledgeCheck": [],
  "intakeNotes": ""
}
```

Use these shapes when adding content to the empty arrays:

| Field | Item shape |
| --- | --- |
| `route` | `{ "id": "unique-area-id", "name": "Area name", "summary": ["Task"], "details": ["Procedure note"] }` |
| `references` | `{ "title": "Reference title", "body": "Reference text", "source": "Source name or URL" }` |
| `knowledgeCheck` | `{ "question": "Question text", "options": ["First option", "Second option"], "answer": 0, "explanation": "Explanation" }` |

`answer` is the zero-based index of the correct option: `0` selects the first option. These shapes describe the format; the shipped template contains no sample duties or questions. Use IANA time-zone names such as `Etc/UTC`, or leave `timeZone` empty for the browser's zone. References and intake notes are plain text.

**Export Position** exports position configuration only. It omits the sign-off name, active/completed shifts and planner records. Review your entered position content before sharing it; site information and reference notes remain part of that configuration.

**Export Backup** is different: it includes local settings and work history so they can be restored. Backup files contain the information you entered, including names, notes and records. Keep them with the appropriate access restrictions. Restoring a backup replaces the current local app data after review and confirmation.

## Use during a shift

- Start work after configuring and reviewing the procedure. Routine duties remain a reference list; this application does not require a checkbox for every task.
- Record exceptions, blocked work, shortages or other irregular conditions with any immediate action and notifications.
- Finish and sign off once at the end. The app saves the completed record locally, downloads a TXT copy, and records the worked period in the planner.
- Use History to revisit completed work. A running shift resumes after reopening the same app in the same browser.

## Install or run offline

For phones and tablets, open the hosted app and use the browser's **Install App** or **Add to Home Screen** option when available. Open it online once so its own application files can be cached; after installation it can load offline. The manifest and service worker are scoped to this application's directory.

The ZIP contains both the normal web app and **Work-Shift-Guide-Blank.html**, a self-contained version with its styles, scripts and icon embedded. Extract the ZIP and open the single HTML file in a modern desktop browser. Some browsers restrict storage or downloads for local files; the HTTPS app or a localhost server is the dependable option when those restrictions apply.

To serve the extracted folder locally with Python installed, run `python3 -m http.server 8000` from that folder, then visit `http://localhost:8000/`. On Windows, `py -m http.server 8000` may be the installed command.

Data belongs to the browser and origin used to open the app. The hosted app, a local server and a downloaded HTML file may have separate storage. Export a full backup before changing browsers, devices or locations. Clearing browser site data can remove local records.

## Package contents

- `index.html`, `styles.css`, `app.js`, `position.js`: normal web application and position intake.
- `manifest.webmanifest`, `service-worker.js`, `icons/`: installation and offline support.
- `Work-Shift-Guide-Blank.html`: self-contained application.
- `position-template.json`: empty importable position configuration.
- `README.md`, `LICENSE.txt`, `SHA256SUMS.txt`: instructions, original author license and package-file checksums.

The package is built from an explicit file allowlist. The original job-specific source, browser databases, logs, user imports and backups are not package inputs.

## Rebuild from the repository

From the repository root, run:

```sh
python3 scripts/build-work-shift-guide.py
python3 scripts/build-work-shift-guide.py --check
```

The builder requires only Python's standard library. It embeds the local assets in the standalone HTML, updates the app's cache fingerprint, writes `SHA256SUMS.txt`, and creates `Work-Shift-Guide-Blank-v1.0.0.zip` plus its SHA-256 file in this directory. ZIP order and timestamps are fixed, so unchanged inputs produce identical bytes. `--check` verifies the existing generated outputs without writing them.

## Author and license

Created by **Christopher Vardeman**. The original free reference-use license and attribution are preserved in `LICENSE.txt` and in the application's About section. This is an independent application; importing a procedure does not certify a worker, employer or job.
