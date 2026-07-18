# assets2.newrajshreesweets.com — Cloudflare Worker

A caching reverse-proxy Worker that serves the exact same files as
`assets.newrajshreesweets.com`, but from a **new Cloudflare-proxied hostname**
so Airtel's SNI/DNS hijack of the old hostname is bypassed — no VPN needed.

It also turns the edge into a real CDN: every file is fetched from the origin
once, then served from Cloudflare's cache (HIT) close to each visitor.

## How it works

```
Browser ──► assets2.newrajshreesweets.com (Worker @ Cloudflare edge)
                 │  cache HIT?  ──► serve from edge (fast, no origin hop)
                 │  cache MISS? ──► fetch ORIGIN, store in edge cache, serve
                 ▼
            ORIGIN = https://assets.newrajshreesweets.com (GitHub Pages via CF)
```

The origin fetch happens **server-side from Cloudflare**, so it is never subject
to any ISP filtering inside India.

## One-time setup

```bash
cd cloudflare-worker
npm install
npx wrangler login        # opens browser, authorize the NRS Cloudflare account
```

## Deploy

```bash
npm run deploy            # = wrangler deploy
```

## Cloudflare dashboard / CI

Prefer the **repository root** deploy (`npm ci && npx wrangler deploy`) so Workers Builds
uses the root `wrangler.jsonc` (proxy script only — no static asset upload).

If the dashboard still has Framework=Static and Output Directory=`.`, clear those
settings; this Worker must not publish the image/video tree.

On the first deploy Wrangler:
1. Uploads the Worker.
2. Creates the **proxied** DNS record for `assets2.newrajshreesweets.com`.
3. Attaches the route `assets2.newrajshreesweets.com/*` to the Worker.

Verify:

```bash
curl -I https://assets2.newrajshreesweets.com/logo.webp
# expect: HTTP/2 200, cache-control: ..., x-cache: MISS (then HIT on 2nd call)
```

## Config (wrangler.jsonc → vars)

| var          | meaning                                            | default                              |
| ------------ | -------------------------------------------------- | ------------------------------------ |
| ORIGIN       | where real files live                              | https://raw.githubusercontent.com/.../main |
| EDGE_TTL     | seconds Cloudflare keeps a copy                    | 31536000 (1y)                              |
| BROWSER_TTL  | seconds the browser keeps a copy                   | 31536000 (1y, immutable)                   |
| ALLOW_ORIGIN | CORS origin (`*` or a specific site)               | *                                    |

## Updating assets

Push images to the GitHub repo as usual. New paths are served immediately.
For a **changed** file at the same path, purge it after the deploy:

```bash
# single file (Cloudflare dashboard → Caching → Purge → Custom URL), or API:
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" -H "Content-Type: application/json" \
  --data '{"files":["https://assets2.newrajshreesweets.com/path/to/file.webp"]}'
```

## Logs / debugging

```bash
npm run tail              # live request logs
```
