# STREAMORA — Render-ready movie & series discovery

A Netflix-inspired, mobile-friendly discovery website for films and series. It uses TMDB for live title metadata and regional watch-provider information. Default availability region is Ghana (`GH`).

## Features
- Live trending, popular movies and popular series from TMDB
- Search across films and series
- Current title metadata, posters, summaries and ratings
- Watch-provider lookup by region (Ghana by default)
- Personal watchlist stored in the browser
- Server-side token handling; the TMDB token is never put in browser JavaScript
- In-memory API caching to reduce repeated requests

## What it is — and isn't
STREAMORA is a discovery/availability aggregator. It does **not** host or stream full movies/episodes. Provider availability depends on TMDB's data and may be incomplete or change. The site links to the provider information page where available. Use official, licensed playback sources only.

## 1. Get a TMDB API Read Access Token
1. Create/sign in to a TMDB account at https://www.themoviedb.org/.
2. Open your account settings, then **API**.
3. Request an API key / create an application as required by TMDB.
4. Copy the **API Read Access Token** (Bearer token). Keep it private.

TMDB data is provided under TMDB's terms and attribution requirements. Review https://www.themoviedb.org/documentation/api/terms-of-use and add any required TMDB attribution/branding before public launch.

## 2. Upload to the GitHub repository you already created
From your Android phone:
1. Download and extract this ZIP.
2. Open your existing GitHub repository named `streamora`.
3. Use **Add file → Upload files** and upload `index.html`, `server.js`, `package.json`, `render.yaml`, `.gitignore`, and `README.md` into the repository root.
4. Commit the changes.

If GitHub's mobile site does not let you upload a folder at once, upload the files together from the extracted folder using your browser's desktop-site option, or upload each file.

## 3. Deploy on Render
1. Open https://render.com/ and sign in using the same GitHub account.
2. Choose **New + → Web Service** and connect the `streamora` repository.
3. Render should detect `render.yaml`. If setting fields manually:
   - Runtime: Node
   - Build command: leave blank
   - Start command: `npm start`
4. After the service is created, open **Environment** and add:
   - Key: `TMDB_READ_ACCESS_TOKEN`
   - Value: paste your private TMDB API Read Access Token
5. Save changes and redeploy.
6. Open the public `onrender.com` URL after deployment finishes.

## 4. Test
- Open `/api/health` on your deployed URL. `tokenConfigured` should be `true`.
- Open the home page. It should load trending titles.
- Open a title to check provider data for Ghana.
- Search for a known film or series.

## Notes
- The default country is Ghana (`GH`). The frontend stores a region setting in local storage for future region-selector extension; this prototype defaults to GH.
- Provider filters only work for provider names included in the loaded catalog results; title-level provider lookup is available in the details panel.
- Watchlists are saved in the current browser only. Accounts and cross-device sync are not included.
- TMDB data can be incomplete, so never promise that a provider offers a title unless its current regional result confirms it.
