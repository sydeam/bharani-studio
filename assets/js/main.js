/* Bharani Studio landing page — no dependencies. */
(() => {
  'use strict';

  /* ---------- Config: change here if the number ever changes ---------- */
  const WHATSAPP_NUMBER = '919908996227'; // country code + number, no "+" or spaces

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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

  /* ---------- Sticky action bar (phones) ----------
     Visible once the hero buttons have scrolled away, hidden again when the
     contact section is on screen (it has its own buttons). */
  const dock = $('#dock');
  const heroActions = $('#hero-actions');
  const contact = $('#contact');
  if (dock && heroActions && contact && 'IntersectionObserver' in window) {
    let heroVisible = true;
    let contactVisible = false;
    const update = () => dock.classList.toggle('is-on', !heroVisible && !contactVisible);
    new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; update(); }).observe(heroActions);
    new IntersectionObserver(([en]) => { contactVisible = en.isIntersecting; update(); }, { threshold: 0.15 }).observe(contact);
  } else if (dock) {
    dock.classList.add('is-on');
  }

  /* ---------- Gallery lightbox ---------- */
  const tiles = $$('#gallery .tile');
  const lb = $('#lightbox');
  if (tiles.length && lb) {
    const img = $('#lb-img');
    const cap = $('#lb-cap');
    let index = 0;

    const show = (i) => {
      index = (i + tiles.length) % tiles.length;
      const t = tiles[index];
      img.src = t.dataset.full;
      img.alt = $('img', t).alt;
      cap.textContent = `${t.dataset.cap} · ${index + 1} of ${tiles.length}`;
      // warm the next photo so swiping feels instant
      new Image().src = tiles[(index + 1) % tiles.length].dataset.full;
    };

    tiles.forEach((t, i) => t.addEventListener('click', () => {
      if (typeof lb.showModal !== 'function') { window.open(t.dataset.full, '_blank', 'noopener'); return; }
      show(i);
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
