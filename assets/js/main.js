/* Bharani Studio landing page — no dependencies. */
(() => {
  'use strict';

  /* ---------- Config: change here if the number ever changes ---------- */
  const WHATSAPP_NUMBER = '919908996227'; // country code + number, no "+" or spaces

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  document.documentElement.classList.add('js');

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
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  /* ---------- Portfolio filters ---------- */
  const filterButtons = $$('.filter-btn');
  const galleryTiles = $$('#gallery .tile');
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    galleryTiles.forEach((tile) => {
      const visible = filter === 'all' || tile.dataset.category === filter;
      tile.classList.toggle('is-hidden', !visible);
      tile.setAttribute('aria-hidden', String(!visible));
    });
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

  /* ---------- Review carousel ---------- */
  const reviewSlides = $$('.review-slide');
  const reviewDots = $$('.review-dot');
  const reviewPause = $('#review-pause');
  if (reviewSlides.length && reviewDots.length) {
    let reviewIndex = 0;
    let reviewTimer = null;
    let reviewPaused = false;

    const showReview = (nextIndex) => {
      reviewIndex = (nextIndex + reviewSlides.length) % reviewSlides.length;
      reviewSlides.forEach((slide, index) => {
        const active = index === reviewIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      reviewDots.forEach((dot, index) => {
        const active = index === reviewIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
    };
    const startReviewTimer = () => {
      window.clearInterval(reviewTimer);
      if (!reviewPaused && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        reviewTimer = window.setInterval(() => showReview(reviewIndex + 1), 5600);
      }
    };
    reviewDots.forEach((dot) => dot.addEventListener('click', () => {
      showReview(Number(dot.dataset.reviewTo));
      startReviewTimer();
    }));
    if (reviewPause) {
      reviewPause.addEventListener('click', () => {
        reviewPaused = !reviewPaused;
        reviewPause.setAttribute('aria-pressed', String(reviewPaused));
        reviewPause.setAttribute('aria-label', reviewPaused ? 'Play review rotation' : 'Pause review rotation');
        reviewPause.textContent = reviewPaused ? '▶' : 'Ⅱ';
        startReviewTimer();
      });
    }
    startReviewTimer();
  }

  /* ---------- Enquiry form -> WhatsApp ---------- */
  const form = $('#enquiry');
  if (form) {
    const dateInput = $('#f-date', form);
    const nameInput = $('#f-name', form);
    const nameErr = $('#f-name-err', form);

    // no point picking a date in the past
    const now = new Date();
    dateInput.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    nameInput.addEventListener('input', () => {
      nameInput.removeAttribute('aria-invalid');
      nameErr.textContent = '';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.setAttribute('aria-invalid', 'true');
        nameErr.textContent = 'Please add your name so we know who to reply to.';
        nameInput.focus();
        return;
      }
      const type = $('#f-type', form).value;
      let when = 'Not decided yet';
      if (dateInput.value) {
        const [y, m, d] = dateInput.value.split('-').map(Number);
        when = new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      const text =
        `Hi Bharani Studio, I'm ${name}.\n` +
        `Planning: ${type}\n` +
        `When: ${when}\n` +
        `Could you share your availability?` + refTag();

      track('form_submit', { label: type });
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url; // popup blocked: navigate instead
    });
  }
})();
