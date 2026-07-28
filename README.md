# reel

A minimal watchlist finder — browse trending films and series, search, filter by genre or streaming service, save titles for later, watch trailers, and see where each one streams. Built with React + Vite, powered by TMDB.

## Deploying from your phone (GitHub web UI + Vercel)

**1. Create the repo**
- On github.com, tap **+ → New repository**, name it `reel`, keep it public, create it.

**2. Add the files**
For each file below, use **Add file → Create new file**, type the exact path shown (this creates folders for you), paste the contents, and commit:
- `package.json`
- `vite.config.js`
- `index.html`
- `.gitignore`
- `src/main.jsx`
- `src/App.jsx`
- `src/index.css`

**3. Deploy on Vercel**
- Go to vercel.com → **Add New → Project** → import the `reel` repo.
- Vercel auto-detects Vite. Leave the defaults (Build Command `vite build`, Output Directory `dist`) and hit **Deploy**.
- Every commit you make on GitHub after this will auto-redeploy.

That's it — no build step on your end, Vercel does it.

## Notes
- The TMDB key is used client-side (standard for a v3 API key on a personal project like this).
- Watchlist is saved in the browser via `localStorage`, so it's per-device.
- Streaming availability defaults to the US region (`watch_region=US` in `App.jsx`) — change that constant if you want another region.
