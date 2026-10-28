// Downloads every photo the page links from bharanistudio.lovable.app into
// assets/img/photos/ and rewrites index.html to use the local copies.
// Run this once, with internet on, BEFORE you deploy:   npm run localize-images
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const htmlUrl = new URL('index.html', root);
const outDir = new URL('assets/img/photos/', root);

const html = await readFile(htmlUrl, 'utf8');
const pattern = /https:\/\/bharanistudio\.lovable\.app\/__l5e\/assets-v1\/[0-9a-f-]+\/([\w.-]+\.(?:webp|jpe?g|png))/g;
const urls = [...new Set(html.match(pattern) || [])];

if (!urls.length) {
  console.log('No remote photos found in index.html: nothing to do (already localised?).');
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const used = new Map(); // filename -> url, to catch two different photos sharing a name
let out = html;
let failed = 0;

for (const url of urls) {
  let name = url.split('/').pop();
  if (used.has(name) && used.get(name) !== url) name = `${url.split('/').at(-2).slice(0, 8)}-${name}`;
  used.set(name, url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(new URL(name, outDir), Buffer.from(await res.arrayBuffer()));
    out = out.split(url).join(`assets/img/photos/${name}`);
    console.log(`saved   ${name}`);
  } catch (err) {
    failed++;
    console.warn(`FAILED  ${name}  (${err.message}) — left as a remote link`);
  }
}

// once everything is local, the early connection to their site is no longer needed
if (!failed) out = out.replace(/[ \t]*<link rel="preconnect" href="https:\/\/bharanistudio\.lovable\.app"[^>]*>\n?/, '');

await writeFile(htmlUrl, out);
console.log(failed ? `\nDone with ${failed} failure(s). Run it again to retry those.` : `\nDone. All ${urls.length} photos are now local. You can deploy.`);
