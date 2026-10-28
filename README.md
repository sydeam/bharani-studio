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

The photos are linked directly from `bharanistudio.lovable.app` so the page looks complete
straight away. **Before deploying, save them into the project** so the page doesn't depend on
their site (internet on, once):

```bash
npm run localize-images
```

This downloads all 10 photos to `assets/img/photos/` and rewrites `index.html` to use them.
Want to swap a photo? Replace the `src` (and `data-full` for gallery tiles) in `index.html`.

## What to edit

| What | Where |
| --- | --- |
| Copy, buttons, links | `index.html` (each section is commented) |
| WhatsApp number | `index.html` (search `919908996227`) and `WHATSAPP_NUMBER` at the top of `assets/js/main.js` |
| Client names under reviews | `index.html`, the `<footer>` inside each `.quote` (currently generic labels) |
| Colours | `assets/css/styles.css`, the `:root` tokens at the top |
| Theme | `<html data-theme="earthy">` → `"olive"` or `"light"` (your other two mockups) |
| Open Graph image URL | `index.html`, replace `YOUR-DOMAIN` after you deploy |

## Ads and tracking

- Paste your Meta Pixel / Google tag / GTM snippet where the comment in `<head>` says so.
- Clicks and the form send events automatically to `dataLayer`, `gtag` and `fbq` if present:
  `whatsapp_click`, `call_click`, `form_submit`, `gallery_open`, `cta_click`, `instagram_click`, `map_click`.
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
  fonts/        Gloock (headings) + Hanken Grotesk (text), self-hosted
  img/          logo (vector), favicon, share image, photos/ after localising
scripts/
  serve.mjs             local preview server
  localize-images.mjs   saves the photos locally
```
