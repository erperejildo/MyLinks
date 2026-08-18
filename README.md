# My Links

A Chrome browser extension for job seekers to save, organize, and quickly copy-paste links needed during job applications.

## Features

- Save links with descriptive titles
- Edit or delete saved links
- Copy individual URLs to clipboard
- Copy all saved URLs at once with one click
- Persistent storage across browser sessions

## Installation

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `my_links/` directory
5. Click the extension icon in the toolbar to open the popup

## Development

Edit files, then reload the extension in `chrome://extensions`.

```bash
npm run build    # compile SCSS to CSS
npm run watch    # auto-recompile on changes
```

## Tech Stack

- Chrome Extension (Manifest V3)
- Vanilla HTML/CSS/JavaScript
- `chrome.storage.local` for data persistence
- SCSS compiled via Dart Sass

## License

Copyright (c) 2026 [Axis Labs](https://axislabs.eu)

Released under the MIT License — free to use as long as you don't profit from it.
See [LICENSE](LICENSE) for details.
