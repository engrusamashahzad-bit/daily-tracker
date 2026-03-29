# Daily Progress Tracker — GitHub Pages Deployment Guide

---

## Project Structure

```
daily-tracker/
├── index.html    ← Main HTML, all views
├── style.css     ← Dark theme, responsive layout
├── script.js     ← All app logic (modular, no frameworks)
└── README.md     ← This file
```

---

## Step-by-Step Deployment to GitHub Pages

### Step 1 — Create a GitHub Account
Go to https://github.com and sign up (free).

---

### Step 2 — Create a New Repository

1. Click the **"+"** icon → **"New repository"**
2. Name it: `daily-tracker` (or anything you like)
3. Set visibility to **Public** (required for free GitHub Pages)
4. Leave everything else as default
5. Click **"Create repository"**

---

### Step 3 — Upload Your Files

**Option A — Via GitHub Web Interface (easiest)**

1. On your new repo page, click **"uploading an existing file"**
2. Drag and drop all 3 files:
   - `index.html`
   - `style.css`
   - `script.js`
3. Scroll down, add a commit message like `"Initial upload"`
4. Click **"Commit changes"**

**Option B — Via Git CLI**

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/daily-tracker.git
cd daily-tracker

# Copy your files into this folder, then:
git add .
git commit -m "Initial upload"
git push origin main
```

---

### Step 4 — Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** (top menu)
3. Scroll down to the **"Pages"** section in the left sidebar
4. Under **"Source"**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **"Save"**

---

### Step 5 — Access Your App

After ~60 seconds, your app will be live at:

```
https://YOUR_USERNAME.github.io/daily-tracker/
```

GitHub will show the URL at the top of the Pages settings section.

---

## Making Updates Later

Whenever you want to update the app:

**Via Web Interface:**
1. Open the file on GitHub
2. Click the pencil ✏️ icon to edit
3. Save with "Commit changes"

**Via Git CLI:**
```bash
git add .
git commit -m "Update message"
git push origin main
```

Changes go live within ~30 seconds.

---

## Notes

- **Data is stored in your browser's localStorage** — it won't sync across devices.
- To back up your data, use the **Export** button inside the app.
- To restore on another device, use **Import** with the exported JSON file.
- The app works fully offline once the page is loaded.

---

## Customization Tips

| What to change | Where |
|---|---|
| Accent color | `style.css` → `--accent: #00e5ff` |
| App name | `index.html` → `.brand-text` and `<title>` |
| Fonts | `index.html` → Google Fonts link + `style.css` → `--sans` / `--mono` |
| Motivational messages | `script.js` → `Entries.getMotivation()` |
| Max recent entries on dashboard | `script.js` → `.slice(0, 5)` in `Dashboard.renderRecentEntries()` |
