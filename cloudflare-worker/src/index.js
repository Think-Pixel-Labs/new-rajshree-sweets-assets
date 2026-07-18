/**
 * assets2.newrajshreesweets.com  —  caching reverse-proxy Worker.
 *
 * Why this exists:
 *   Airtel (IN) is SNI/DNS-hijacking the original `assets.newrajshreesweets.com`
 *   hostname. Serving the exact same files from a *different* Cloudflare-proxied
 *   hostname (assets2.*) gives a fresh SNI that is not on their blocklist, so
 *   users get the assets without a VPN.
 *
 * What it does for speed:
 *   - Pulls each file from ORIGIN once, then serves every later request from
 *     Cloudflare's edge cache (HIT) in the visitor's own country.
 *   - Forces "cache everything" + long edge TTL even though the origin is a
 *     static host that may send weak cache headers.
 *   - Adds correct Cache-Control, CORS, security and timing headers.
 *   - Streams byte-range requests (video scrubbing) straight through.
 */

const IMMUTABLE_EXT = /\.(webp|avif|jpe?g|png|gif|svg|ico|mp4|webm|woff2?|css|js)$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only safe, cacheable methods. Reply to CORS preflights cheaply.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, OPTIONS", ...corsHeaders(env) },
      });
    }

    const edgeTtl = Number(env.EDGE_TTL || "2592000");
    const browserTtl = Number(env.BROWSER_TTL || "86400");
    const originUrl = env.ORIGIN.replace(/\/$/, "") + url.pathname + url.search;

    // Range requests (e.g. video seeking) must not be served from a full-body
    // cache entry. Stream them through, but still let CF cache the full object.
    const isRange = request.headers.has("range");
    if (isRange) {
      const originResp = await fetch(originUrl, {
        method: request.method,
        headers: passThroughReqHeaders(request),
        cf: { cacheEverything: true, cacheTtl: edgeTtl },
      });
      return decorate(originResp, env, browserTtl, "STREAM");
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });

    let response = await cache.match(cacheKey);
    if (response) {
      response = new Response(response.body, response);
      response.headers.set("X-Cache", "HIT");
      return maybeStripBody(request, response);
    }

    // MISS -> go to origin, ask CF to cache the upstream copy too.
    const originResp = await fetch(originUrl, {
      method: "GET",
      headers: passThroughReqHeaders(request),
      cf: { cacheEverything: true, cacheTtl: edgeTtl },
    });

    response = decorate(originResp, env, browserTtl, "MISS");

    // Only cache successful, complete responses.
    if (response.status === 200) {
      const toStore = response.clone();
      // Edge copy lives for edgeTtl regardless of the (shorter) browser TTL.
      toStore.headers.set(
        "Cache-Control",
        `public, max-age=${edgeTtl}, immutable`,
      );
      ctx.waitUntil(cache.put(cacheKey, toStore));
    }

    return maybeStripBody(request, response);
  },
};

function passThroughReqHeaders(request) {
  const h = new Headers();
  // Forward only what the origin needs; drop CF/host noise.
  for (const name of ["range", "if-none-match", "if-modified-since", "accept"]) {
    const v = request.headers.get(name);
    if (v) h.set(name, v);
  }
  h.set("Accept-Encoding", "gzip, br");
  return h;
}

function decorate(originResp, env, browserTtl, cacheState) {
  const url = new URL(originResp.url);
  const response = new Response(originResp.body, originResp);

  // Browser-facing caching. Immutable for fingerprintable/static media so the
  // browser never even re-validates; shorter for everything else.
  if (response.status === 200) {
    if (IMMUTABLE_EXT.test(url.pathname)) {
      response.headers.set(
        "Cache-Control",
        `public, max-age=${browserTtl}, stale-while-revalidate=604800`,
      );
    } else {
      response.headers.set("Cache-Control", "public, max-age=300");
    }
    // ponytail: raw.githubusercontent.com may send text/plain for .webp
    if (/\.webp$/i.test(url.pathname)) {
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("image")) response.headers.set("Content-Type", "image/webp");
    }
  }

  // CORS so the assets load cross-origin from the main website.
  for (const [k, v] of Object.entries(corsHeaders(env))) {
    response.headers.set(k, v);
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Timing-Allow-Origin", "*");
  response.headers.set("X-Cache", cacheState);
  response.headers.set("Vary", "Accept-Encoding");
  // Hide which upstream served it.
  response.headers.delete("Server");
  response.headers.delete("Via");
  return response;
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function maybeStripBody(request, response) {
  if (request.method === "HEAD") {
    return new Response(null, response);
  }
  return response;
}
