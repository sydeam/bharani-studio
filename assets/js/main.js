/* Bharani Studio landing page — no dependencies. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  document.documentElement.classList.add('js');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hero: tap a rear photo to rotate all three positions ---------- */
  const heroMedia = $('.hero__media');
  if (heroMedia) {
    const heroCards = [$('.arch', heroMedia), $('.hero__side--left', heroMedia), $('.hero__side--right', heroMedia)];
    const heroLabel = $('[data-hero-label]', heroMedia);
    const showHero = (nextIndex) => {
      const selected = heroCards[nextIndex];
      if (selected.dataset.heroSlot === 'front') return;
      heroCards.forEach((card, index) => {
        card.dataset.heroSlot = ['front', 'left', 'right'][(index - nextIndex + heroCards.length) % heroCards.length];
        card.setAttribute('aria-pressed', String(index === nextIndex));
      });
      if (heroLabel) heroLabel.textContent = `${String(nextIndex + 1).padStart(2, '0')} — THE WEDDING EDIT`;
    };
    heroCards.forEach((card, index) => card.addEventListener('click', () => showHero(index)));
  }

  /* ---------- Ad tracking helpers ----------
     Sends the same event to GTM (dataLayer), GA4 (gtag) and Meta Pixel (fbq)
     if those scripts are on the page. Safe to run with none of them. */
  const track = (event, params = {}) => {
    try {
      (window.dataLayer = window.dataLayer || []).push({ event, ...params });
      if (typeof window.gtag === 'function') window.gtag('event', event, params);
      if (typeof window.fbq === 'function') {
        const isLead = event === 'whatsapp_click' || event === 'call_click' || event === 'form_submit';
        window.fbq('trackCustom', event, params);
        if (isLead) window.fbq('track', 'Contact', params);
      }
    } catch (_) { /* never break the page for analytics */ }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) track(el.dataset.track, { label: el.dataset.label || '' });
  });

  /* ---------- Carry ad UTM tags into WhatsApp messages ----------
     So the studio can see which ad a chat came from. */
  const utm = (() => {
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    const found = {};
    try {
      const q = new URLSearchParams(location.search);
      keys.forEach((k) => { if (q.get(k)) found[k] = q.get(k); });
      if (Object.keys(found).length) sessionStorage.setItem('bs_utm', JSON.stringify(found));
      else Object.assign(found, JSON.parse(sessionStorage.getItem('bs_utm') || '{}'));
    } catch (_) { /* storage blocked: fine */ }
    return found;
  })();

  const refTag = () => {
    const bits = [utm.utm_source, utm.utm_campaign].filter(Boolean);
    return bits.length ? `\n\n(via ${bits.join(' / ')})` : '';
  };

  if (refTag()) {
    $$('a[href^="https://wa.me/"]').forEach((a) => {
      const url = new URL(a.href);
      url.searchParams.set('text', (url.searchParams.get('text') || '') + refTag());
      a.href = url.toString();
    });
  }

  /* ---------- Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Sticky action bar ----------
     It is intentionally persistent for ad traffic, so visitors can start a
     WhatsApp conversation from any section of the landing page. */
  const dock = $('#dock');
  if (dock) dock.classList.add('is-on');

  /* ---------- Section reveal ---------- */
  const revealItems = $$('.section__head, .review-carousel, .gallery, .svc-list, .about__photo, .about__text, .reach-wrap > div, .contact__actions');
  revealItems.forEach((item) => item.classList.add('reveal'));
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.01 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  /* ---------- Scroll-driven photo spread ----------
     Scroll and resize only schedule one animation frame. The browser retains
     native touch scrolling; reduced-motion visitors see the finished layout. */
  const moments = $('#moments');
  const stage = $('#moments-stage');
  if (moments && stage) {
    const cards = $$('.memory', stage);
    const words = $('.moments__words', stage);
    let framePending = false;
    let nearby = true;
    const drawSpread = () => {
      framePending = false;
      const rect = moments.getBoundingClientRect();
      const sticky = $('.moments__sticky', moments);
      const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 96;
      const range = Math.max(1, rect.height - sticky.offsetHeight);
      const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (top - rect.top) / range));
      const spread = Math.max(0, Math.min(1, (progress - 0.02) / 0.8));
      const eased = 1 - Math.pow(1 - spread, 3);
      cards.forEach((card, index) => {
        const x = Number(card.dataset.x) * stage.clientWidth / 100 * eased;
        const y = Number(card.dataset.y) * stage.clientHeight / 100 * eased;
        const rotation = Number(card.dataset.rotate) * (0.35 + 0.65 * eased);
        const scale = 1.45 - 0.45 * eased;
        card.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg) scale(${scale})`;
        card.style.zIndex = String(7 - index);
      });
      words.style.opacity = String(Math.max(0, Math.min(1, (spread - 0.18) * 2.8)));
    };
    const scheduleSpread = () => {
      if (framePending || !nearby) return;
      framePending = true;
      window.requestAnimationFrame(drawSpread);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        nearby = entry.isIntersecting;
        if (nearby) scheduleSpread();
      }, { rootMargin: '150px' }).observe(moments);
    }
    window.addEventListener('scroll', scheduleSpread, { passive: true });
    window.addEventListener('resize', scheduleSpread);
    reducedMotion.addEventListener('change', scheduleSpread);
    drawSpread();
  }

  /* ---------- Portfolio filters ---------- */
  const filterButtons = $$('.filter-btn');
  const galleryTiles = $$('#gallery .tile');
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    galleryTiles.forEach((tile) => {
      const visible = filter === 'all' || tile.dataset.category === filter;
      tile.classList.toggle('is-hidden', !visible);
      tile.setAttribute('aria-hidden', String(!visible));
    });
    const visibleCount = galleryTiles.filter(tile => !tile.classList.contains('is-hidden')).length;
    const emptyState = $('#gallery-empty');
    if (emptyState) emptyState.hidden = visibleCount > 0;
    const galleryStatus = $('#gallery-status');
    if (galleryStatus) galleryStatus.textContent = visibleCount ? `${visibleCount} ${filter === 'all' ? '' : filter + ' '}photographs shown.` : 'Ask us for our corporate photography portfolio on WhatsApp.';
    track('gallery_filter', { label: filter });
  }));

  /* ---------- Gallery lightbox ---------- */
  const tiles = $$('#gallery .tile');
  const lb = $('#lightbox');
  if (tiles.length && lb) {
    const img = $('#lb-img');
    const cap = $('#lb-cap');
    let index = 0;

    const show = (i) => {
      const visibleTiles = tiles.filter((tile) => !tile.classList.contains('is-hidden'));
      if (!visibleTiles.length) return;
      index = (i + visibleTiles.length) % visibleTiles.length;
      const t = visibleTiles[index];
      img.src = t.dataset.full;
      img.alt = $('img', t).alt;
      cap.textContent = `${t.dataset.cap} · ${index + 1} of ${visibleTiles.length}`;
      // warm the next photo so swiping feels instant
      new Image().src = visibleTiles[(index + 1) % visibleTiles.length].dataset.full;
    };

    tiles.forEach((t) => t.addEventListener('click', () => {
      if (typeof lb.showModal !== 'function') { window.open(t.dataset.full, '_blank', 'noopener'); return; }
      const visibleTiles = tiles.filter((tile) => !tile.classList.contains('is-hidden'));
      show(visibleTiles.indexOf(t));
      lb.showModal();
      track('gallery_open', { label: t.dataset.cap });
    }));

    $('#lb-close').addEventListener('click', () => lb.close());
    $('#lb-prev').addEventListener('click', () => show(index - 1));
    $('#lb-next').addEventListener('click', () => show(index + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // swipe left / right on phones
    let startX = null;
    lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Reviews: three-second autoplay with arrows, dots, and swipe ---------- */
  const reviewSlides = $$('.review-slide');
  const reviewDots = $$('.review-dot');
  if (reviewSlides.length && reviewDots.length) {
    let reviewIndex = 0;
    let reviewTimer = null;
    const reviewCarousel = $('#review-carousel');

    const showReview = (nextIndex) => {
      // Keep the carousel's top in place when changing photo aspect ratios.
      const previousTop = reviewCarousel.getBoundingClientRect().top;
      reviewIndex = (nextIndex + reviewSlides.length) % reviewSlides.length;
      reviewSlides.forEach((slide, index) => {
        const active = index === reviewIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      reviewDots.forEach((dot, index) => {
        const active = index === reviewIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-pressed', String(active));
      });
      const currentTop = reviewCarousel.getBoundingClientRect().top;
      if (previousTop < 100 && currentTop !== previousTop) window.scrollBy(0, currentTop - previousTop);
    };
    const startReviewTimer = () => {
      window.clearInterval(reviewTimer);
      if (!reducedMotion.matches && !document.hidden) {
        reviewTimer = window.setInterval(() => showReview(reviewIndex + 1), 3000);
      }
    };
    reviewDots.forEach((dot) => dot.addEventListener('click', () => {
      showReview(Number(dot.dataset.reviewTo));
      startReviewTimer();
    }));
    $('#review-prev')?.addEventListener('click', () => { showReview(reviewIndex - 1); startReviewTimer(); });
    $('#review-next')?.addEventListener('click', () => { showReview(reviewIndex + 1); startReviewTimer(); });
    let reviewTouch = null;
    reviewCarousel.addEventListener('touchstart', event => {
      reviewTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    reviewCarousel.addEventListener('touchend', event => {
      if (!reviewTouch) return;
      const dx = event.changedTouches[0].clientX - reviewTouch.x;
      const dy = event.changedTouches[0].clientY - reviewTouch.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        showReview(reviewIndex + (dx < 0 ? 1 : -1));
        startReviewTimer();
      }
      reviewTouch = null;
    }, { passive: true });
    reviewCarousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') showReview(reviewIndex - 1);
      if (event.key === 'ArrowRight') showReview(reviewIndex + 1);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.clearInterval(reviewTimer);
      else startReviewTimer();
    });
    reducedMotion.addEventListener('change', startReviewTimer);
    startReviewTimer();
  }
})();
