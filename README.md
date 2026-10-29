# Bharani Studio — ad landing page

Mobile-first landing page for Bharani Studio (Nellore). Plain HTML, CSS and JavaScript:
no framework and no build step, so it loads fast for ad traffic and deploys anywhere.

## Run it on your laptop

**Option A — just open it:** double-click `index.html`.

**Option B — local server (recommended, closest to production):**

```bash
npm start            # http://localhost:5173   (needs Node 18+, nothing to install)
# or:  python3 -m http.server 5173
```

Open it on your phone too: use your laptop's IP, e.g. `http://192.168.1.20:5173`.

## Photos

Studio website photographs are stored in `assets/img/photos/`, and public Instagram
photographs in `assets/img/instagram/`. The page serves images locally, so it doesn't
depend on external image hosts or expiring Instagram URLs. Original source links
and the review content document are recorded in `assets/img/SOURCES.md`.

If adding more remote studio website images, download them with:

```bash
npm run localize-images
```

This downloads remote studio photos to `assets/img/photos/` and updates the HTML.
Want to swap a photo? Replace the `src` (and `data-full` for gallery tiles) in `index.html`.

## What to edit

| What | Where |
| --- | --- |
| Copy, buttons, links | `index.html` (each section is commented) |
| WhatsApp number | `index.html` (search `919908996227`) |
| Review copy and bylines | `index.html`, the `.review-slide` blocks in the review carousel |
| Colours | `assets/css/styles.css`, the `:root` tokens at the top |
| Scroll-spread photo positions | `index.html`, each `.memory` element's `data-x`, `data-y`, and `data-rotate` |
| Open Graph image URL | `index.html`, replace `YOUR-DOMAIN` after you deploy |

## Ads and tracking

- Paste your Meta Pixel / Google tag / GTM snippet where the comment in `<head>` says so.
- Clicks and portfolio filters send events automatically to `dataLayer`, `gtag` and `fbq` if present:
  `whatsapp_click`, `call_click`, `gallery_filter`, `gallery_open`, `cta_click`, `instagram_click`, `map_click`.
  Each carries a `label` saying which button it was.
- If the ad URL has `utm_source` / `utm_campaign`, those are added to the WhatsApp message
  ("via instagram / diwali-offer") so the studio can see which ad a chat came from.
  Example: `https://your-domain/?utm_source=instagram&utm_campaign=diwali-offer`

## Deploy

Upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
There is nothing to build: publish directory is the project root.

## Structure

```
index.html
assets/
  css/styles.css
  js/main.js
  fonts/        Gloock (headings/quotes) + Hanken Grotesk (text), self-hosted
  img/          logo, favicon, share image, photos/, instagram/, SOURCES.md
scripts/
  serve.mjs             local preview server
  localize-images.mjs   saves the photos locally
  inspect-mobile.mjs    browser screenshots and responsive checks (optional Playwright)
```

Tap a rear hero photo to rotate all three photos into new positions. Repeated left
taps cycle 1 → 2 → 3 → 1; right taps reverse the cycle. Hero images do not autoplay.
The photo spread uses the original scroll timing, section height, easing, and lazy image loading from commit `29108f7`,
follows native scrolling, and respects reduced motion. Reviews
autoplay every three seconds, with swipe, arrows, and dots. All
four reviews use the supplied document's copy. Corporate images were not supplied;
the Corporate filter offers a WhatsApp request rather than mislabelling wedding photos.

For browser QA, use an existing Playwright installation (or set `BHARANI_PLAYWRIGHT`
to its `index.mjs` path), start the local server, and run `node scripts/inspect-mobile.mjs`.
Screenshots are saved to the ignored `.preview/` folder.
