# New Rajshree Sweets — Assets

## How delivery works

| Hostname | What serves it | What to change |
| --- | --- | --- |
| `assets.newrajshreesweets.com` | **GitHub Pages** (this repo, `main` / root) | Push WebP/image updates here |
| `assets2.newrajshreesweets.com` | **Cloudflare Worker** `nrs-assets2-proxy` (caching reverse-proxy) | Deploy Worker code only — it fetches from Pages |

The Worker does **not** host image/video files. It proxies and edge-caches the Pages origin so Airtel SNI/DNS issues on `assets.` are bypassed.

## Cloudflare Workers Builds / `npx wrangler deploy`

Root `wrangler.jsonc` deploys **only** `cloudflare-worker/src/index.js` (no static asset upload).

- Build command: `npm ci && npx wrangler deploy` (or `npx wrangler deploy` after install)
- Root directory: repository root
- Do **not** set Framework = Static / Output Directory = `.` — that uploads `videos/*.mp4` and hits the 25 MiB Workers asset limit

Local:

```bash
npm ci
npm run dry-run    # verify config; no upload of videos/
npm run deploy     # requires wrangler auth / CLOUDFLARE_API_TOKEN
```

Or from the nested package:

```bash
cd cloudflare-worker && npm ci && npm run deploy
```

## Do not ship as Worker assets

Exclude from any Workers Static Assets / curated publish root:

- `videos/` (multi‑10s of MiB MP4s)
- `misc-images/`, JPG masters
- `_opt-backup-*`
- `node_modules/`, `.git/`

## Cache purge

After replacing a file at the same path, purge Cloudflare (and wait for Pages to finish building):

- Dashboard → Caching → Purge → Custom URLs for both `assets.` and `assets2.` URLs
