// Local visual QA helper. Uses an existing Playwright install; no site dependency.
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const modulePath = process.env.BHARANI_PLAYWRIGHT;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: true });
await mkdir('.preview', { recursive: true });
const reference = process.argv.includes('--reference');
const instagram = process.argv.includes('--instagram');
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto(instagram ? 'https://www.instagram.com/bharanistudionellore/' : reference ? 'https://www.thebigdaybychai.com/' : 'http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 45000 });
if (instagram) {
  await page.waitForTimeout(4000);
  const photos = await page.locator('img').evaluateAll(imgs => imgs
    .filter(img => img.alt.startsWith('Photo by Sai Krishna') && img.naturalWidth >= 500)
    .map(img => ({ src: img.currentSrc || img.src, alt: img.alt, post: img.closest('a')?.href })));
  await mkdir('assets/img/instagram', { recursive: true });
  for (const [index, photo] of photos.entries()) {
    const response = await page.request.get(photo.src);
    assert(response.ok());
    const extension = response.headers()['content-type']?.includes('webp') ? 'webp' : 'jpg';
    const name = `assets/img/instagram/studio-${String(index + 1).padStart(2, '0')}.${extension}`;
    await writeFile(name, await response.body());
    console.log(JSON.stringify({ name, alt: photo.alt, post: photo.post }));
  }
  await browser.close();
  process.exit(0);
}
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(900);
await page.screenshot({ path: `.preview/${reference ? 'reference' : 'home'}-mobile.png` });
if (reference) {
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.preview/reference-scroll.png' });
  console.log('Reference inspected at 390px; screenshots saved to .preview.');
} else {
  const scrollTo = async (top) => {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await page.waitForTimeout(150);
  };
  const assertWidth = async (label) => {
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')].filter(el => {
        const b = el.getBoundingClientRect();
        return b.width && (b.right > innerWidth + 1 || b.left < -1);
      }).map(el => ({class: el.className, x: el.getBoundingClientRect().x, right: el.getBoundingClientRect().right})).slice(0, 8),
    }));
    assert(result.width <= page.viewportSize().width + 1, `${label}: horizontal overflow ${JSON.stringify(result)}`);
  };
  await page.locator('img[src]').evaluateAll(async imgs => {
    await Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode(); }));
  });
  const activeReview = () => page.locator('.review-slide.is-active').getAttribute('data-review');
  const frontHero = () => page.locator('.hero__media [data-hero-slot="front"] img').getAttribute('src');
  assert.equal(await page.locator('#review-pause, #hero-pause').count(), 0);
  const initialReview = Number(await activeReview());
  const initialHero = await frontHero();
  await page.waitForTimeout(3100);
  assert.equal(Number(await activeReview()), (initialReview + 1) % 4, 'Reviews must autoplay after three seconds');
  assert.equal(await frontHero(), initialHero, 'Hero photos must stay still until tapped');
  console.log('PASS three-second review autoplay without pause controls; hero has no autoplay');
  const selectedWidths = process.argv.find(arg => arg.startsWith('--width='))?.split('=')[1].split(',').map(Number);
  for (const width of selectedWidths || [320, 360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await scrollTo(0);
    await assertWidth(`${width}px hero`);
    assert.equal(await page.locator('.nav a:visible').count(), 3);
    const rearPhotos = await page.locator('.hero__media [data-hero-slot]:not([data-hero-slot="front"])').evaluateAll(cards => cards.map(card => {
      const image = card.querySelector('img');
      const bounds = image.getBoundingClientRect();
      let exposed = 0;
      const y = bounds.y + bounds.height * 0.45;
      for (let x = Math.max(0, bounds.x); x < Math.min(innerWidth, bounds.right); x += 2) {
        if (document.elementFromPoint(x, y)?.closest('[data-hero-slot]') === card) exposed += 2;
      }
      return { exposed, loaded: image.complete && image.naturalWidth > 0 };
    }));
    assert(rearPhotos.every(photo => photo.loaded && photo.exposed > 15), `Both rear hero images must remain tappable: ${JSON.stringify(rearPhotos)}`);
    const sequenceStart = await frontHero();
    const forwardSequence = new Set([sequenceStart]);
    for (const [index, slot] of ['left', 'left', 'left', 'right'].entries()) {
      const target = page.locator(`.hero__media [data-hero-slot="${slot}"]`);
      const oldFront = await frontHero();
      const selected = await target.locator('img').getAttribute('src');
      const otherSlot = slot === 'left' ? 'right' : 'left';
      const otherRear = await page.locator(`[data-hero-slot="${otherSlot}"] img`).getAttribute('src');
      const point = await target.evaluate(card => {
        const bounds = card.getBoundingClientRect();
        const points = [];
        const y = bounds.y + bounds.height * 0.45;
        for (let x = Math.max(0, bounds.x); x < Math.min(innerWidth, bounds.right); x += 2) {
          if (document.elementFromPoint(x, y)?.closest('[data-hero-slot]') === card) points.push({ x, y });
        }
        return points[Math.floor(points.length / 2)];
      });
      assert(point, 'A visible part of the rear image must accept taps');
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForTimeout(750);
      assert.equal(await frontHero(), selected, 'Tapped rear photograph must become the main image');
      assert.equal(await page.locator(`[data-hero-slot="${otherSlot}"] img`).getAttribute('src'), oldFront, 'Previous main image must rotate into the opposite rear slot');
      assert.equal(await page.locator(`[data-hero-slot="${slot}"] img`).getAttribute('src'), otherRear, 'Other rear photo must rotate into the tapped rear slot');
      if (index < 2) forwardSequence.add(await frontHero());
      if (index === 2) {
        assert.equal(forwardSequence.size, 3, 'Consecutive left taps must feature all three photos');
        assert.equal(await frontHero(), sequenceStart, 'Three left taps must complete the 1-2-3-1 cycle');
      }
      assert.equal(await page.locator('.hero__media [aria-pressed="true"]').count(), 1);
      await assertWidth(`Hero rotation ${index + 1}`);
      if (width === 390) await page.screenshot({ path: `.preview/hero-tap-${index + 1}-mobile.png` });
    }
    const dock = await page.locator('#dock').boundingBox();
    assert(dock.y + dock.height <= 845 && dock.x >= 0, `Dock must remain fully visible at ${width}px: ${JSON.stringify(dock)}; ${JSON.stringify(await page.evaluate(() => ({width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth})))}`);
    const start = await page.locator('#moments').evaluate(el => el.offsetTop);
    const range = await page.locator('#moments').evaluate(el => el.offsetHeight - el.firstElementChild.offsetHeight);
    await scrollTo(start - 96);
    const before = await page.locator('.memory--1').evaluate(el => el.getBoundingClientRect().x);
    await scrollTo(start - 96 + range * 0.9);
    const after = await page.locator('.memory--1').evaluate(el => el.getBoundingClientRect().x);
    assert(Math.abs(before - after) > 50, 'Photographs must spread as the visitor scrolls');
    await assertWidth(`${width}px photo spread`);
    if (width === 390) await page.screenshot({ path: '.preview/photo-spread-mobile.png' });
    for (let review = 0; review < 4; review++) {
      await page.locator(`[data-review-to="${review}"]`).evaluate(el => el.click());
      const media = page.locator('.review-slide.is-active img');
      await media.evaluate(el => el.decode());
      const fit = await media.evaluate(el => ({ fit: getComputedStyle(el).objectFit, transform: getComputedStyle(el).transform, naturalWidth: el.naturalWidth, height: el.clientHeight }));
      assert.equal(fit.fit, 'contain', 'Complete review photograph must be visible');
      assert.equal(fit.transform, 'none', 'Review photographs must not zoom');
      assert(fit.naturalWidth > 0 && fit.height > 0);
      await assertWidth(`${width}px review ${review + 1}`);
      if (width === 390) {
        await page.locator('#review-carousel').scrollIntoViewIfNeeded();
        await page.waitForTimeout(700);
        await page.locator('#review-carousel').screenshot({ path: `.preview/review-${review + 1}-mobile.png`, style: '#dock, .top { visibility: hidden; }' });
      }
    }
    if (width === 1440) {
      await scrollTo(0);
      await page.screenshot({ path: '.preview/home-desktop.png' });
    }
    console.log(`PASS ${width}px: navigation, full review photos, scroll spread, no horizontal overflow, sticky CTA`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const category of ['weddings', 'baby', 'maternity', 'corporate', 'all']) {
    await page.locator(`[data-filter="${category}"]`).evaluate(el => el.click());
    const categories = await page.locator('#gallery .tile:visible').evaluateAll(tiles => tiles.map(tile => tile.dataset.category));
    assert(categories.every(c => category === 'all' || c === category));
    if (category === 'corporate') assert(await page.locator('#gallery-empty').isVisible());
  }
  await page.locator('[data-filter="maternity"]').evaluate(el => el.click());
  await page.locator('#gallery .tile:visible').first().click();
  assert(await page.locator('#lightbox').evaluate(el => el.open));
  assert.match(await page.locator('#lb-cap').innerText(), /1 of 2/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#lightbox').evaluate(el => el.open), false);
  await page.locator('[data-filter="all"]').evaluate(el => el.click());
  for (const section of ['#work', '#services', '#about', '#where', '#contact']) {
    await page.locator(section).scrollIntoViewIfNeeded();
    await page.waitForTimeout(750);
    await page.locator(section).screenshot({ path: `.preview/${section.slice(1)}-mobile.png`, style: '#dock, .top { visibility: hidden; }' });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await scrollTo(await page.locator('#moments').evaluate(el => el.offsetTop));
  assert.equal(await page.locator('.moments__sticky').evaluate(el => getComputedStyle(el).position), 'relative');
  assert.equal(await page.locator('.reach__ring').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS filters, filtered lightbox, keyboard close, reduced motion, all local images, no JavaScript errors');
}
await browser.close();
