# Forma — local-first question bank & practice app
Vanilla HTML/CSS/JS PWA. No backend, no dependencies, no accounts. Data lives in IndexedDB (questions, history) and LocalStorage (preferences).

## Run locally
Service workers and ES modules need http, not file://: `python3 -m http.server 8000` then open http://localhost:8000.

## Deploy to GitHub Pages
Push this folder to a repo → Settings → Pages → deploy from branch (root). All paths are relative, so project sub-paths work.

## JSON import format
Single set or an array of sets. Rules: `subject`/`topic` non-empty strings; each question has `question` (text), exactly 4 non-empty `choices`, integer `answer` 0–3, string `explanation`, `difficulty` of easy|medium|hard, optional `type: "multiple_choice"`. Invalid questions are reported and skipped; duplicates (same subject, topic and question text) are skipped. See `samples/`.

## Backup
Settings → Export question bank (questions + history). Restore with the file picker; restore merges.

## Mascot
A pet mascot (bottom-right) reacts to answers, streaks, results and imports. Sprites are 3×2 sheets in `assets/`; the reaction→cell map is the `SP` object at the top of `js/app.js` ([sheet,row,col]). Toggle it in Settings.

## Offline
After the first load, the service worker caches the app shell. Bump `C` in service-worker.js when shipping updates.
