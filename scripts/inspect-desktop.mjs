// Responsive regression checks for the desktop photo spread and enquiry CTA.
// Uses an existing Playwright installation; no production dependency.
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const modulePath = process.env.BHARANI_PLAYWRIGHT;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: true });
await mkdir('.preview', { recursive: true });
const errors = [];
const overlaps = (a, b) => a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1;

try {
  for (const [width, height] of [[320, 740], [390, 844], [700, 900], [768, 1024], [1024, 768], [1280, 720], [1366, 600], [1440, 900], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('img[src]')].map(img => { img.loading = 'eager'; return img.decode(); }));
    });
    await page.waitForTimeout(900);
    const checkWidth = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}x${height}: horizontal overflow`);
    await checkWidth();
    assert.equal(await page.locator('.nav a:visible').count(), 3);
    if (width >= 1024) await page.screenshot({ path: `.preview/home-${width}x${height}.png` });

    const scrollSpread = async progress => {
      await page.evaluate(p => {
        const section = document.querySelector('#moments');
        const sticky = section.querySelector('.moments__sticky');
        const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h'));
        const range = section.offsetHeight - sticky.offsetHeight;
        window.scrollTo({ top: section.offsetTop - top + range * p, behavior: 'instant' });
      }, progress);
      await page.waitForTimeout(100);
    };
    const geometry = () => page.evaluate(() => {
      const box = el => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      return {
        stage: box(document.querySelector('.moments__stage')),
        title: box(document.querySelector('#moments-title')),
        eyebrow: box(document.querySelector('.moments__eyebrow')),
        caption: box(document.querySelector('.moments__bottom')),
        dock: box(document.querySelector('#dock')),
        cards: [...document.querySelectorAll('.memory')].map(box),
      };
    });
    for (const progress of [0, 0.15, 0.35, 0.6, 0.9]) {
      await scrollSpread(progress);
      await checkWidth();
      const g = await geometry();
      if (width >= 700) {
        assert(Math.abs(g.stage.width - Math.min(width - 64, 1200)) < 1 && Math.abs(g.stage.x + g.stage.width / 2 - width / 2) < 1, `${width}x${height}: desktop stage must use the available width and stay centered`);
        assert(g.title.height >= 80 && g.cards[0].width >= 75, `${width}x${height}: desktop typography and photos must remain appropriately sized`);
        assert(g.caption.bottom <= g.dock.y, `${width}x${height}: section CTA must sit above the sticky dock`);
        for (const [index, card] of g.cards.entries()) {
          const label = `${width}x${height}, progress ${progress}, photo ${index + 1}`;
          assert(card.x >= g.stage.x - 1 && card.right <= g.stage.right + 1 && card.y >= g.stage.y - 1 && card.bottom <= g.stage.bottom + 1, `${label}: photo escaped its stage: ${JSON.stringify(g)}`);
          assert(!overlaps(card, g.caption) && !overlaps(card, g.eyebrow), `${label}: photo covered caption/CTA or eyebrow`);
          if (progress >= 0.35) assert(!overlaps(card, g.title), `${label}: photo covered the revealed headline: ${JSON.stringify(g)}`);
        }
      } else {
        // The original mobile endpoints and scroll/easing formula must be preserved.
        const expected = await page.locator('.memory--1').evaluate(el => {
          const section = document.querySelector('#moments');
          const sticky = section.querySelector('.moments__sticky');
          const stage = document.querySelector('#moments-stage');
          const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h'));
          const p = Math.max(0, Math.min(1, (top - section.getBoundingClientRect().top) / (section.getBoundingClientRect().height - sticky.offsetHeight)));
          const spread = Math.max(0, Math.min(1, (p - 0.02) / 0.8));
          const eased = 1 - Math.pow(1 - spread, 3);
          const matrix = new DOMMatrix(getComputedStyle(el).transform);
          return { actualX: matrix.e, actualY: matrix.f, x: -el.offsetWidth / 2 + Number(el.dataset.x) * stage.clientWidth / 100 * eased, y: -el.offsetHeight / 2 + Number(el.dataset.y) * stage.clientHeight / 100 * eased };
        });
        assert(Math.abs(expected.actualX - expected.x) < 1 && Math.abs(expected.actualY - expected.y) < 1, `Mobile animation changed: ${JSON.stringify(expected)}`);
      }
    }
    await page.screenshot({ path: `.preview/spread-${width}x${height}.png` });
    if (width >= 700) {
      const link = page.locator('.moments__bottom .text-link');
      const clear = await link.evaluate(el => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      });
      assert(clear, `${width}x${height}: second-section CTA must be unobstructed`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100);
      const g = await geometry();
      for (const card of g.cards) assert(!overlaps(card, g.title) && !overlaps(card, g.caption), 'Reduced-motion desktop layout must also stay clear');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    await page.locator('#enquire').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    const alignment = await page.locator('.booking__submit').evaluate(el => {
      const button = el.getBoundingClientRect();
      const form = el.closest('form').getBoundingClientRect();
      return Math.abs(button.x + button.width / 2 - (form.x + form.width / 2));
    });
    assert(alignment < 1, `${width}x${height}: WhatsApp submit button must be centered`);
    await checkWidth();
    if ([390, 1440].includes(width)) {
      await page.waitForTimeout(750);
      await page.locator('#enquire').screenshot({ path: `.preview/enquiry-centered-${width}.png`, style: '#dock, .top { visibility: hidden; }' });
    }
    console.log(`PASS ${width}x${height}: centered submit, no overflow, ${width >= 700 ? 'photos clear of title/CTA throughout spread; reduced motion checked' : 'original mobile animation unchanged'}`);
    await page.close();
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS responsive desktop/mobile checks; no JavaScript errors.');
} finally {
  await browser.close();
}
