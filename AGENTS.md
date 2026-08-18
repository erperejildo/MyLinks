# My Links - Chrome Extension

## Overview

**My Links** is a Chrome browser extension (Manifest V3) designed for job seekers to save, organize, and quickly copy-paste links needed during job applications. It provides a lightweight popup UI where users can add links with descriptive titles, edit or delete them, copy individual URLs, and reorder links via drag-and-drop for easy pasting into application forms.

**Author:** Axis Labs

## Project Structure

```
my_links/
├── manifest.json        # Chrome extension manifest (MV3)
├── index.html           # Popup UI markup
├── src/
│   └── styles.scss      # SCSS source (edit this)
├── styles.css           # Compiled CSS output (generated)
├── popup.js             # All popup logic (CRUD, storage, clipboard)
├── package.json         # npm config with sass dev dependency
├── images/
│   └── icon256.png      # Extension icon (256x256)
├── .gitignore           # Ignores node_modules/
└── AGENTS.md            # This file
```

## Tech Stack

- **Platform:** Chrome Extension (Manifest V3)
- **Storage:** `chrome.storage.local` for persistent link data across browser sessions
- **Clipboard API:** `navigator.clipboard.writeText()` with `document.execCommand('copy')` fallback
- **UI:** Vanilla HTML/CSS/JavaScript — no frameworks, no dependencies
- **Styling:** SCSS compiled to CSS via Dart Sass, system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`), CSS custom properties for colors

## How It Works

### Data Model

Links are stored as an array of objects in `chrome.storage.local` under the key `links`:

```json
[
  {
    "id": "m1a2b3c4d5e6f",
    "title": "Google Careers",
    "url": "https://careers.google.com/jobs"
  }
]
```

- **id** — Unique identifier generated via `Date.now().toString(36)` + random string
- **title** — User-provided descriptive name for the link
- **url** — The full URL to save

### Popup UI Flow

1. **Adding a link:** User fills in Title and URL fields, clicks "Save". The link is appended to the array and persisted.
2. **Editing a link:** User clicks the "edit" button on a saved link item. The form populates with that link's data, the Save button changes to "Update", and a Cancel button appears. Saving updates the existing record.
3. **Deleting a link:** User clicks the "del" button. The link is removed from the array and storage.
4. **Copying a link:** User clicks the "copy" button. The URL is written to the clipboard. The button briefly shows "done" as visual feedback.
5. **Reordering links:** User clicks "Reorder" in the section header. Each link item shows a drag handle on the right side. User can drag items to reorder them. Changes are visual only until "Done" (checkmark icon) is clicked, which persists the new order. Click "Done" to exit reorder mode and save.

### Key Files

#### `manifest.json`
- Manifest version: 3
- Declares `storage` permission for `chrome.storage.local`
- Defines the popup via `action.default_popup`
- Extension icon at 256x256

#### `index.html`
- Single-page popup with two sections:
  - **Form section** — Title input, URL input, Save button, Cancel button (hidden by default), hidden `edit-id` field for tracking edit state
  - **Links section** — Header with "Reorder" button, `<ul>` list for rendered link items, empty state message

#### `src/styles.scss`
- SCSS source file — edit this for all styling changes
- Fixed popup dimensions: `width: 380px`, `max-height: 520px`, `overflow-y: auto`
- Card-based layout for form and link items with `border-radius: 8px` and subtle borders
- Action buttons use SVG icons for copy, edit, delete, and drag handles
- Hover states with color-coded backgrounds: green for copy, blue for edit, red for delete
- `.hidden` class for visibility toggling (no inline styles)
- `.btn-icon` class for icon-only button mode (used by Done button in reorder mode)
- Toast notifications via a `.toast` class with CSS opacity transitions
- Form inputs use system fonts with blue focus ring

#### `styles.css`
- Auto-generated from `src/styles.scss` — do not edit directly

#### `popup.js`
- **`loadLinks()`** — Reads `links` from `chrome.storage.local`, falls back to empty array
- **`saveLinks()`** — Writes current `links` array to `chrome.storage.local`
- **`renderLinks()`** — Clears and rebuilds the `<ul>` list from the `links` array, toggles empty state and Reorder button visibility, adds drag handles in reorder mode
- **`toggleReorderMode()`** — Toggles between normal and reorder views, stores original order on enter, saves to storage on exit (Done click), updates button between text "Reorder" and checkmark icon
- **`attachDragListeners()`** — Attaches drag-and-drop event listeners to each link item when in reorder mode
- **Drag-and-drop handlers** — `handleDragStart`, `handleDragEnd`, `handleDragOver`, `handleDragEnter`, `handleDragLeave`, `handleDrop` manage the reorder flow and update the array order on drop (visual only, saved on Done click)
- **`generateId()`** — Creates unique IDs using timestamp + random alphanumeric string
- **`escapeHtml()`** — Prevents XSS by using `textContent`/`innerHTML` swap
- **`resetForm()`** — Clears inputs, resets edit state, re-focuses title input
- **`showToast()`** — Creates/reuses a toast element, shows it for 1.5 seconds
- **`copyToClipboard()`** — Uses Clipboard API with fallback to `execCommand`
- Event delegation on `#links-list` for copy/edit/delete button clicks (disabled during reorder mode)
- Reorder button toggles reorder mode on/off
- Form submit handled via Save button click listener with validation (both fields required)

## Storage Details

- **Key:** `links`
- **Scope:** `chrome.storage.local` (per-extension, persists across browser restarts)
- **Fallback:** Defaults to `[]` if no data exists
- **No sync:** Data does not sync across devices (would require `chrome.storage.sync`)

## Development

### Loading the Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `my_links/` directory
5. The extension icon appears in the toolbar — click it to open the popup

### Making Changes

- Edit `popup.js` for behavior changes
- Edit `src/styles.scss` for visual changes (then run `npm run build`)
- Edit `index.html` for structural changes
- Reload the extension in `chrome://extensions` after changes (click the refresh icon on the extension card)

### Build Step

Styles are authored in SCSS and compiled to CSS:

```bash
npm run build    # compile once
npm run watch    # auto-recompile on file changes
```

After editing `src/styles.scss`, run the build command or use watch mode. The compiled `styles.css` is what Chrome loads.

## Design Decisions

- **No framework:** Keeps the extension lightweight and fast-loading as a popup
- **Text-based action buttons:** Avoids needing an icon font or SVG icons; keeps the DOM simple
- **Event delegation:** Single listener on the `<ul>` instead of per-item listeners, improving performance for large link lists
- **Hidden input for edit state:** Uses a hidden `<input>` to track which link is being edited, keeping the form logic simple
- **Clipboard fallback:** Handles environments where `navigator.clipboard` is unavailable (e.g., certain Chrome security contexts)
- **Toast notifications:** Lightweight feedback mechanism without blocking the UI

## Future Considerations

- Categories or tags for organizing links by company/role
- Import/export links as JSON or CSV
- Keyboard shortcuts for power users
- Search/filter functionality for large link lists
- Tab grouping integration
- Link preview on hover
