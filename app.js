/* ════════════════════════════════════════════════════════════════════
   app.js — shared site behavior for ALL language pages (one source).
   Loaded after i18n-data.js. Edit here; no rebuild needed for JS changes.
   ════════════════════════════════════════════════════════════════════ */

    // ─────────────────────────────────────────────────────────
    //  PERFORMANCES — edit this array to update the events shown on the site.
    //  Past events are automatically dimmed. Upcoming events appear first.
    //  • name:     bilingual event title  { es: "…", en: "…" }
    //  • date:     "YYYY-MM-DD" format
    //  • time:     display string, e.g. "7:00 PM"
    //  • location: bilingual location     { es: "…", en: "…" }
    //  • image:    path to a photo (or null for placeholder)
    //  • link:     URL for "More info" (or null → links to contact form)
    // ─────────────────────────────────────────────────────────
    const EVENTS = window.__I18N__.events.slice();

    // ─────────────────────────────────────────────────────────
    //  TRANSLATION STRINGS
    // ─────────────────────────────────────────────────────────
    const STRINGS = window.__I18N__.strings;

    // ── Dynamic season / year ──
    function getCurrentSeason(lang) {
      var m = new Date().getMonth(); // 0-11
      var seasons = window.__I18N__.seasons;
      var idx = m < 3 ? 0 : m < 6 ? 1 : m < 9 ? 2 : 3;
      return seasons[lang] ? seasons[lang][idx] : seasons.en[idx];
    }

    // ─────────────────────────────────────────────────────────
    //  LANGUAGE STATE & APPLY FUNCTION
    // ─────────────────────────────────────────────────────────
    function normalizeLang(code) {
      var c = (code || '').toLowerCase();
      if (c === 'zht') return 'zht';
      if (c.indexOf('zh') === 0) {
        // Traditional-script regions/tags → zht; everything else Chinese → zh.
        return /hant|-tw|-hk|-mo/.test(c) ? 'zht' : 'zh';
      }
      if (c.indexOf('ja') === 0) return 'ja';
      if (c.indexOf('es') === 0) return 'es';
      return 'en';
    }
    // Pre-rendered pages set <html lang>; fall back to the browser's language.
    let currentLang = normalizeLang(document.documentElement.lang || navigator.language || navigator.userLanguage || 'en');

    function applyLanguage(lang) {
      const dict = STRINGS[lang];
      if (!dict) return;

      var year = new Date().getFullYear();
      var season = getCurrentSeason(lang);

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) {
          el.textContent = dict[key].replace('{year}', year).replace('{season}', season);
        }
      });

      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (dict[key] !== undefined) {
          el.innerHTML = dict[key];
        }
      });

      document.querySelectorAll('[data-placeholder-i18n]').forEach(el => {
        const key = el.getAttribute('data-placeholder-i18n');
        if (dict[key] !== undefined) {
          el.setAttribute('placeholder', dict[key]);
        }
      });

      // Use the full BCP 47 tag (zh-Hans / zh-Hant) so :lang() CSS keeps matching.
      var metaInfo = window.__I18N__ && window.__I18N__.meta && window.__I18N__.meta[lang];
      document.documentElement.lang = (metaInfo && metaInfo.htmlLang) || lang;

      const switchCurrent = document.getElementById('langSwitchCurrent');
      const native = (window.__I18N__ && window.__I18N__.native) || {};
      if (switchCurrent) switchCurrent.textContent = native[lang] || lang;
      document.querySelectorAll('#langSwitchMenu [data-lang]').forEach(function (a) {
        if (a.getAttribute('data-lang') === lang) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });

      // Re-render events for current language
      if (typeof renderEvents === 'function') renderEvents(lang);
      // Keep the gallery toggle label in sync with the language
      if (typeof updateGalleryButton === 'function') updateGalleryButton();
    }

    // ─────────────────────────────────────────────────────────
    //  LANGUAGE TOGGLE INITIALIZATION
    // ─────────────────────────────────────────────────────────
    function initializeLanguageToggle() {
      applyLanguage(currentLang);
      var sw = document.getElementById('langSwitch');
      var btn = document.getElementById('langSwitchBtn');
      var menu = document.getElementById('langSwitchMenu');
      if (!sw || !btn || !menu) return;
      function close() { sw.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
      function open() { sw.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        sw.classList.contains('open') ? close() : open();
      });
      document.addEventListener('click', function (e) { if (!sw.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      // Remember an explicit language choice so auto-detect honors it next time.
      // The cookie lets Vercel's edge redirect (vercel.json) skip auto-detection too.
      menu.addEventListener('click', function (e) {
        var a = e.target.closest('[data-lang]');
        if (!a) return;
        var chosen = a.getAttribute('data-lang');
        try { localStorage.setItem('bfmh-lang', chosen); } catch (e2) {}
        document.cookie = 'bfmh-lang=' + chosen + '; Max-Age=31536000; Path=/; SameSite=Lax';
        // Progressive enhancement: swap the language in place instead of a full
        // page load. The href stays real for crawlers, no-JS, and open-in-new-tab.
        var I = window.__I18N__;
        if (I && I.strings[chosen] && I.meta[chosen] && history.pushState) {
          e.preventDefault();
          applyLanguage(chosen);
          currentLang = chosen;
          document.title = I.meta[chosen].title;
          history.pushState({ lang: chosen }, '', a.getAttribute('href') + location.hash);
          close();
        }
      });
      // Back/forward across in-place switches: re-apply the language for the URL.
      window.addEventListener('popstate', function () {
        var I = window.__I18N__;
        if (!I) return;
        var p = location.pathname;
        var lang = 'en';
        for (var key in I.meta) {
          if (I.meta[key].path !== '/' && p.indexOf(I.meta[key].path) === 0 &&
              I.meta[key].path.length > I.meta[lang].path.length) lang = key; // longest match wins (/zh-hant/ over /zh/)
        }
        if (I.strings[lang]) {
          applyLanguage(lang);
          currentLang = lang;
          document.title = I.meta[lang].title;
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeLanguageToggle);
    } else {
      initializeLanguageToggle();
    }

    // ─────────────────────────────────────────────────────────
    //  VIDEO FACADES — click thumbnail to load the YouTube player
    //  (keeps the page fast: no iframe until the visitor clicks)
    // ─────────────────────────────────────────────────────────
    function initVideoFacades() {
      document.querySelectorAll('.video-facade').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-video-id');
          if (!id) return;
          var item = btn.closest('.video-item');
          if (!item) return;
          var iframe = document.createElement('iframe');
          iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
          iframe.title = btn.getAttribute('aria-label') || 'YouTube video';
          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          iframe.referrerPolicy = 'strict-origin-when-cross-origin';
          iframe.allowFullscreen = true;
          item.innerHTML = '';
          item.appendChild(iframe);
        });
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVideoFacades);
    } else {
      initVideoFacades();
    }

    // ─────────────────────────────────────────────────────────
    //  VIDEO CAROUSEL — arrow buttons scroll the strip by one view
    // ─────────────────────────────────────────────────────────
    function initVideoCarousel() {
      var carousel = document.querySelector('.video-carousel');
      if (!carousel) return;
      var strip = carousel.querySelector('.video-strip');
      var prev = carousel.querySelector('[data-carousel-prev]');
      var next = carousel.querySelector('[data-carousel-next]');
      if (!strip || !prev || !next) return;

      function page() {
        var first = strip.querySelector('.video-item');
        var gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
        var step = first ? first.getBoundingClientRect().width + gap : strip.clientWidth;
        // scroll a little less than a full viewport so a card always peeks
        return Math.max(step, strip.clientWidth - step);
      }

      function updateArrows() {
        var maxScroll = strip.scrollWidth - strip.clientWidth - 1;
        prev.disabled = strip.scrollLeft <= 0;
        next.disabled = strip.scrollLeft >= maxScroll;
      }

      prev.addEventListener('click', function () {
        strip.scrollBy({ left: -page(), behavior: 'smooth' });
      });
      next.addEventListener('click', function () {
        strip.scrollBy({ left: page(), behavior: 'smooth' });
      });
      strip.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows);
      updateArrows();

      // ── Auto-advance ──────────────────────────────────────────
      // Gently scrolls one view every few seconds, loops back at the
      // end, and stops for good once the visitor takes over.
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var ADVANCE_MS = 4500;
      var timer = null;
      var stopped = false;

      function advance() {
        var maxScroll = strip.scrollWidth - strip.clientWidth - 1;
        if (strip.scrollLeft >= maxScroll) {
          strip.scrollTo({ left: 0, behavior: 'smooth' });   // loop to start
        } else {
          strip.scrollBy({ left: page(), behavior: 'smooth' });
        }
      }

      function start() {
        if (stopped || timer || reduceMotion) return;
        if (strip.scrollWidth <= strip.clientWidth + 1) return;  // nothing to scroll
        timer = window.setInterval(advance, ADVANCE_MS);
      }
      function pause() {
        if (timer) { window.clearInterval(timer); timer = null; }
      }
      function stop() {            // permanent: visitor has taken control
        stopped = true;
        pause();
      }

      // Pause on hover/focus, resume after; stop on real interaction.
      carousel.addEventListener('mouseenter', pause);
      carousel.addEventListener('mouseleave', start);
      carousel.addEventListener('focusin', pause);
      carousel.addEventListener('focusout', start);
      prev.addEventListener('click', stop);
      next.addEventListener('click', stop);
      strip.addEventListener('touchstart', stop, { passive: true });
      strip.addEventListener('wheel', stop, { passive: true });
      // Once a video is opened, leave the carousel where it is.
      strip.addEventListener('click', function (e) {
        if (e.target.closest('.video-facade')) stop();
      });

      // Only auto-play while the section is on screen.
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { en.isIntersecting ? start() : pause(); });
        }, { threshold: 0.3 }).observe(carousel);
      } else {
        start();
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVideoCarousel);
    } else {
      initVideoCarousel();
    }

    // ─────────────────────────────────────────────────────────
    //  EVENTS RENDERING
    // ─────────────────────────────────────────────────────────
    const MONTH_NAMES = window.__I18N__.months;

    const EVENTS_VISIBLE = 4;
    let eventsExpanded = false;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function buildEventCard(ev, lang, now) {
      const d = new Date(ev.date + 'T00:00:00');
      const day = d.getDate();
      const month = MONTH_NAMES[lang][d.getMonth()];
      const year = d.getFullYear();
      const isPast = d < now;
      const name = esc(ev.name[lang] || ev.name.en || ev.name.es);
      const loc = esc(ev.location[lang] || ev.location.en || ev.location.es);
      const time = esc(ev.time);

      return '<article class="event-card' + (isPast ? ' is-past' : '') + '" role="listitem">'
        + '<div class="event-date-badge"><span class="day">' + day + '</span><span class="month">' + month + '</span><span class="year">' + year + '</span></div>'
        + '<div class="event-card-body">'
        + '<h3>' + name + '</h3>'
        + '<div class="event-meta">'
        + '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + loc + '</span>'
        + (ev.time ? '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + time + '</span>' : '')
        + '</div>'
        + '</div>'
        + '</article>';
    }

    function animateCards(grid) {
      grid.querySelectorAll('.event-card').forEach((card, i) => {
        card.classList.add('fade-in', 'stagger');
        card.style.setProperty('--i', i);
        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                io.unobserve(entry.target);
              }
            });
          }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
          io.observe(card);
        } else {
          card.classList.add('visible');
        }
      });
    }

    function renderEvents(lang) {
      const upcomingGrid = document.getElementById('events-grid-upcoming');
      const pastGrid = document.getElementById('events-grid-past');
      const emptyMsg = document.getElementById('events-empty');
      const toggleWrap = document.getElementById('events-toggle');
      const toggleBtn = document.getElementById('eventsToggleBtn');
      if (!upcomingGrid || !pastGrid) return;
      const now = new Date();
      now.setHours(0,0,0,0);

      const upcoming = EVENTS.filter(ev => new Date(ev.date + 'T00:00:00') >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      const past = EVENTS.filter(ev => new Date(ev.date + 'T00:00:00') < now)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Upcoming: show all, soonest first
      upcomingGrid.innerHTML = upcoming.map(ev => buildEventCard(ev, lang, now)).join('');
      animateCards(upcomingGrid);
      if (emptyMsg) emptyMsg.style.display = upcoming.length ? 'none' : '';

      // Past: show EVENTS_VISIBLE by default, most recent first
      const visiblePast = eventsExpanded ? past : past.slice(0, EVENTS_VISIBLE);
      pastGrid.innerHTML = visiblePast.map(ev => buildEventCard(ev, lang, now)).join('');
      animateCards(pastGrid);

      // Toggle button for past events
      if (past.length > EVENTS_VISIBLE && toggleWrap && toggleBtn) {
        toggleWrap.style.display = '';
        const dict = STRINGS[lang];
        toggleBtn.classList.toggle('is-expanded', eventsExpanded);
        toggleBtn.textContent = eventsExpanded
          ? (dict['events.showLess'] || 'Show less')
          : (dict['events.showMore'] || 'See past events') + ' (' + past.length + ')';
      } else if (toggleWrap) {
        toggleWrap.style.display = 'none';
      }
    }

    // Toggle expand/collapse
    document.getElementById('eventsToggleBtn').addEventListener('click', function () {
      eventsExpanded = !eventsExpanded;
      renderEvents(currentLang);
    });

    // Render events on initial load
    renderEvents(currentLang);

    // Gigs flagged "Show on website" in /team/; a static i18n-data.js entry on the same date + name wins.
    if (window.fetch) {
      fetch('/api/public-events').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.events || !d.events.length) return;
        var have = {};
        EVENTS.forEach(function (ev) { have[ev.date + '|' + (ev.name.en || '').toLowerCase()] = true; });
        var added = 0;
        d.events.forEach(function (ev) {
          var k = ev.date + '|' + (ev.name.en || '').toLowerCase();
          if (have[k]) return;
          have[k] = true; EVENTS.push(ev); added++;
        });
        if (added) renderEvents(currentLang);
      }).catch(function () {});
    }

    // ─────────────────────────────────────────────────────────
    //  GALLERY — justified rows + click-to-enlarge lightbox
    // ─────────────────────────────────────────────────────────
    // Collapsed by default to a short preview; "View all photos" reveals the
    // rest inline (and toggles to "Show less").
    let galleryExpanded = false;

    function updateGalleryButton() {
      const btn = document.getElementById('galleryViewAll');
      if (!btn) return;
      const dict = (typeof STRINGS !== 'undefined' && STRINGS[currentLang]) ? STRINGS[currentLang] : null;
      btn.textContent = galleryExpanded
        ? ((dict && dict['gallery.showLess']) || 'Show less')
        : ((dict && dict['gallery.viewAll']) || 'View all photos');
    }

    // Justified-rows layout (Flickr/Google Photos style): pack photos into
    // rows, then scale each full row's HEIGHT so its photos fit the width at
    // their true aspect ratio. Nothing is cropped — every face stays visible.
    function layoutGallery() {
      const strip = document.getElementById('galleryStrip');
      if (!strip) return;
      const items = Array.from(strip.children).filter(el => el.classList.contains('gallery-item'));
      if (!items.length) return;

      const cs = getComputedStyle(strip);
      const gap = parseFloat(cs.gap) || 10;
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const targetH = (parseFloat(cs.getPropertyValue('--row-h')) || 15) * rootPx;
      const containerW = strip.clientWidth;
      if (!containerW) return;

      const arOf = el => parseFloat(el.style.getPropertyValue('--ar')) || 1.4;

      const rows = [];
      let i = 0;

      // Featured top row: the first photo (a special performance) leads a
      // slightly taller row so it reads a bit bigger than the rest. Add
      // following photos until the row is no taller than the cap, then fix it
      // as one row. Keep the cap modest so the top row isn't overpowering.
      const featMax = targetH * 1.55;
      {
        let els = [], sumAR = 0;
        while (i < items.length) {
          els.push(items[i]); sumAR += arOf(items[i]); i++;
          const h = (containerW - gap * (els.length - 1)) / sumAR;
          if (els.length >= 2 && h <= featMax) break;
        }
        rows.push({ els, sumAR, full: true });
      }

      // Greedily group the remaining items into normal container-wide rows.
      let row = [], sumAR = 0;
      for (; i < items.length; i++) {
        row.push(items[i]);
        sumAR += arOf(items[i]);
        if (sumAR * targetH + gap * (row.length - 1) >= containerW) {
          rows.push({ els: row, sumAR, full: true }); row = []; sumAR = 0;
        }
      }
      if (row.length) rows.push({ els: row, sumAR, full: false });

      // Preview: collapsed to the first couple of rows so the section stays
      // short; "View all photos" reveals the rest inline.
      const PREVIEW_ROWS = 2;
      const collapsible = rows.length > PREVIEW_ROWS;
      const collapsed = collapsible && !galleryExpanded;
      const shownRows = collapsed ? rows.slice(0, PREVIEW_ROWS) : rows;
      const shown = new Set();
      shownRows.forEach(r => r.els.forEach(el => shown.add(el)));
      items.forEach(el => { el.style.display = shown.has(el) ? '' : 'none'; });

      shownRows.forEach(r => {
        const gaps = gap * (r.els.length - 1);
        const justifiedH = (containerW - gaps) / r.sumAR;
        // When collapsed, every shown row is full (more rows follow) so it fills
        // the width. When expanded, a sparse last row isn't blown up (centered).
        const h = (r.full || collapsed || justifiedH <= targetH * 1.5) ? justifiedH : targetH;
        r.els.forEach(el => {
          el.style.height = h + 'px';
          el.style.width = (arOf(el) * h) + 'px';
        });
      });

      const viewAll = document.getElementById('galleryViewAll');
      if (viewAll) viewAll.parentElement.style.display = collapsible ? '' : 'none';
      updateGalleryButton();
    }

    (function () {
      const strip = document.getElementById('galleryStrip');
      if (!strip) return;

      layoutGallery();
      // Re-justify on resize (debounced) and once images/fonts have loaded.
      let raf;
      window.addEventListener('resize', function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(layoutGallery);
      });
      window.addEventListener('load', layoutGallery);

      // ── Lightbox (click/tap a photo to view it large) ──
      const box = document.getElementById('lightbox');
      const boxImg = document.getElementById('lightboxImg');
      if (!box || !boxImg) return;

      const imgs = Array.from(strip.querySelectorAll('.gallery-item img'));
      let current = -1;
      let lastFocus = null;

      const counter = document.getElementById('lightboxCount');
      function show(i) {
        current = (i + imgs.length) % imgs.length;
        const src = imgs[current];
        boxImg.src = src.currentSrc || src.src;
        boxImg.alt = src.alt || '';
        if (counter) counter.textContent = (current + 1) + ' / ' + imgs.length;
        // restart the pop-in animation on each navigation
        boxImg.style.animation = 'none';
        void boxImg.offsetWidth;
        boxImg.style.animation = '';
      }
      function open(i) {
        lastFocus = document.activeElement;
        show(i);
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add('open'));
        document.body.style.overflow = 'hidden';
        document.getElementById('lightboxClose').focus();
      }
      function close() {
        box.classList.remove('open');
        document.body.style.overflow = '';
        const done = () => { box.hidden = true; box.removeEventListener('transitionend', done); };
        box.addEventListener('transitionend', done);
        setTimeout(done, 300); // fallback if transitionend doesn't fire
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }

      strip.querySelectorAll('.gallery-item').forEach(function (item, i) {
        const img = item.querySelector('img');
        if (img) img.addEventListener('click', () => open(i));
      });

      const viewAllBtn = document.getElementById('galleryViewAll');
      if (viewAllBtn) viewAllBtn.addEventListener('click', function () {
        galleryExpanded = !galleryExpanded;
        // Photos revealed by expanding were display:none, so the scroll-reveal
        // observer never fired for them — force them visible.
        if (galleryExpanded) {
          strip.querySelectorAll('.gallery-item').forEach(function (el) {
            el.style.transitionDelay = '0ms';
            el.classList.add('visible');
          });
        }
        layoutGallery();
      });

      document.getElementById('lightboxClose').addEventListener('click', close);
      document.getElementById('lightboxPrev').addEventListener('click', () => show(current - 1));
      document.getElementById('lightboxNext').addEventListener('click', () => show(current + 1));
      // Click the dark backdrop (but not the image or buttons) to close.
      box.addEventListener('click', function (e) {
        if (e.target === box || e.target.classList.contains('lightbox-figure')) close();
      });
      document.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(current - 1);
        else if (e.key === 'ArrowRight') show(current + 1);
      });
      // Swipe left/right on touch devices to navigate.
      let touchX = null;
      box.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
        touchX = null;
      }, { passive: true });
    })();

    // ─────────────────────────────────────────────────────────
    //  FOOTER YEAR
    // ─────────────────────────────────────────────────────────
    document.getElementById('footerYear').textContent = new Date().getFullYear();

    // ─────────────────────────────────────────────────────────
    //  STICKY HEADER — add scrolled class for shadow
    // ─────────────────────────────────────────────────────────
    (function () {
      const header = document.querySelector('header');
      const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();

    // ─────────────────────────────────────────────────────────
    //  MOBILE HAMBURGER MENU
    // ─────────────────────────────────────────────────────────
    (function () {
      const toggle = document.getElementById('mobileMenuToggle');
      const nav    = document.getElementById('mobileNav');
      if (!toggle || !nav) return;

      function openMenu() {
        nav.hidden = false;
        nav.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Cerrar menú de navegación');
      }
      function closeMenu() {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menú de navegación');
        setTimeout(() => { nav.hidden = true; }, 260);
      }

      toggle.addEventListener('click', () => {
        toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
      });

      nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', closeMenu);
      });

      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !toggle.contains(e.target)) {
          if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
        }
      });

      window.closeMobileNav = closeMenu;
    })();

    // ─────────────────────────────────────────────────────────
    //  SCROLL-TRIGGERED ANIMATIONS
    // ─────────────────────────────────────────────────────────
    (function () {
      // ── Featured section: scale up ──
      var featured = document.querySelector('.featured-frame');
      if (featured) featured.classList.add('anim-scale-up');

      // ── About section: image slides in from left, text from right ──
      document.querySelectorAll('.about-layout > .about-image-frame').forEach(function(el) {
        el.classList.add('anim-slide-left');
      });
      document.querySelectorAll('.about-layout > .about-text-col').forEach(function(el) {
        el.classList.add('anim-slide-right');
      });
      // Instructors: text from left, image from right
      document.querySelectorAll('.about-instructors > .about-text-col').forEach(function(el) {
        el.classList.add('anim-slide-left');
      });
      document.querySelectorAll('.about-instructors > .about-image-frame').forEach(function(el) {
        el.classList.add('anim-slide-right');
      });
      // Story headings with rotate
      document.querySelectorAll('.story-heading').forEach(function(el) {
        el.classList.add('anim-rotate-in');
      });
      // Story dividers: grow from center
      document.querySelectorAll('#about .story-divider').forEach(function(el) {
        el.classList.add('anim-divider');
      });
      // Service badges: pop in staggered
      document.querySelectorAll('.service-badge').forEach(function(el, i) {
        el.classList.add('anim-badge');
        el.style.transitionDelay = (i * 60) + 'ms';
      });

      // ── Gallery: video carousel items slide up staggered ──
      var videoItems = document.querySelectorAll('.video-item');
      videoItems.forEach(function(el) { el.classList.add('anim-video'); });
      var videoWrap = document.querySelector('.gallery-video-wrap');
      if (videoWrap && videoItems.length) {
        if ('IntersectionObserver' in window) {
          var videoIO = new IntersectionObserver(function(entries, obs) {
            if (entries[0].isIntersecting) {
              videoItems.forEach(function(el, i) {
                setTimeout(function() { el.classList.add('visible'); }, i * 100);
              });
              obs.disconnect();
            }
          }, { threshold: 0.1 });
          videoIO.observe(videoWrap);
        } else {
          videoItems.forEach(function(el) { el.classList.add('visible'); });
        }
      }

      document.querySelectorAll('.gallery-item').forEach(function(el, i) {
        el.classList.add('anim-gallery');
        el.style.transitionDelay = (i * 100) + 'ms';
      });
      document.querySelectorAll('#gallery .section-heading').forEach(function(el) {
        el.classList.add('anim-slide-up');
      });
      document.querySelectorAll('#gallery .story-divider').forEach(function(el) {
        el.classList.add('anim-divider');
      });

      // ── Performances/Events: section heading slides up ──
      document.querySelectorAll('#performances .section-heading').forEach(function(el) {
        el.classList.add('anim-slide-up');
      });

      // ── Classes: cards rotate in staggered ──
      document.querySelectorAll('.class-card').forEach(function(el, i) {
        el.classList.add('anim-rotate-in');
        el.style.transitionDelay = (i * 120) + 'ms';
      });
      document.querySelectorAll('#classes .section-heading').forEach(function(el) {
        el.classList.add('anim-slide-up');
      });
      document.querySelectorAll('#classes .story-divider').forEach(function(el) {
        el.classList.add('anim-divider');
      });
      // Promo banner: scale up
      var promo = document.querySelector('.classes-promo');
      if (promo) promo.classList.add('anim-scale-up');

      // ── Reviews: cards bounce up staggered ──
      document.querySelectorAll('.review-card').forEach(function(el, i) {
        el.classList.add('anim-review');
        el.style.transitionDelay = (i * 100) + 'ms';
      });
      document.querySelectorAll('#reviews .section-heading').forEach(function(el) {
        el.classList.add('anim-slide-up');
      });

      // ── Contact: items slide in staggered, dancer art floats ──
      document.querySelectorAll('.contact-item').forEach(function(el, i) {
        el.classList.add('anim-contact');
        el.style.transitionDelay = (i * 100) + 'ms';
      });
      document.querySelectorAll('#contact .section-heading').forEach(function(el) {
        el.classList.add('anim-slide-left');
      });
      document.querySelectorAll('#contact .story-divider').forEach(function(el) {
        el.classList.add('anim-divider');
      });
      var dancerArt = document.querySelector('.contact-dancer-art');
      if (dancerArt) dancerArt.classList.add('anim-float');
      // Book form slides up
      var formWrapper = document.querySelector('.book-form-wrapper');
      if (formWrapper) formWrapper.classList.add('anim-slide-up');

      // ── Section labels: shimmer effect ──
      document.querySelectorAll('#about .section-label, #gallery .section-label, #performances .section-label, #classes .section-label, #reviews .section-label, #contact .section-label').forEach(function(el) {
        el.classList.add('anim-label');
      });

      // ── Event cards: keep existing stagger behavior ──
      document.querySelectorAll('.events-grid, .classes-grid, .about-cards').forEach(function(grid) {
        Array.from(grid.children).forEach(function(child, i) {
          child.style.setProperty('--i', i);
          child.classList.add('stagger');
        });
      });

      // Legacy fade-in for anything not covered by specific animations
      document.querySelectorAll('.book-layout').forEach(function(el) {
        if (!el.classList.contains('anim-slide-left') && !el.classList.contains('anim-slide-right') &&
            !el.classList.contains('anim-slide-up') && !el.classList.contains('anim-scale-up')) {
          el.classList.add('fade-in');
        }
      });

      // ── Observe all animated elements ──
      var animSelectors = '.fade-in, .anim-slide-left, .anim-slide-right, .anim-scale-up, .anim-rotate-in, .anim-pop, .anim-slide-up, .anim-gallery, .anim-review, .anim-badge, .anim-divider, .anim-contact, .anim-float, .anim-label';

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll(animSelectors).forEach(function(el) { io.observe(el); });
      } else {
        document.querySelectorAll(animSelectors).forEach(function(el) { el.classList.add('visible'); });
      }
    })();

    /* ── Papel picado: breeze + cursor gusts ──────────────────────
       Flags are pinned to the string along their whole top edge, like real
       papel picado glued to the thread: the wind is a skewX applied inside
       each flag's local frame (after its rotation onto the string), so the
       top edge never leaves the line while the body and hem sway. Moving
       the mouse near the banner strengthens the wind locally — sway and
       speed swell with a gaussian falloff around the cursor, then ease
       back down as the mouse moves on. */
    (function () {
      var banner = document.querySelector('#contact .papel-picado');
      if (!banner || !window.requestAnimationFrame) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var svg = banner.querySelector('svg');
      var VIEW_W = 1440;                 // svg viewBox width
      var SIGMA = 140;                   // gust radius, in viewBox units
      var flags = Array.prototype.map.call(banner.querySelectorAll('.ppw'), function (el, i) {
        var use = el.querySelector('use');
        var t = use.getAttribute('transform');
        var m = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(t);
        var rm = /rotate\((-?[\d.]+)\)/.exec(t);
        el.style.animation = 'none';     // take over from the CSS fallback breeze
        return {
          use: use,
          x: m ? parseFloat(m[1]) : 0,   // hang point on the string (viewBox units)
          y: m ? parseFloat(m[2]) : 0,
          angle: rm ? parseFloat(rm[1]) : 0,          // resting tilt along the string
          pre: rm ? t.slice(0, rm.index) : t + ' ',   // transform up to rotate(...)
          post: rm ? t.slice(rm.index + rm[0].length) : '',
          speed: 1.05 + (i % 5) * 0.16,  // rad/s, varied so the wave ripples along the string
          phase: i * 1.9,
          phase2: i * 0.8 + 2.3,
          gust: 0
        };
      });

      var mouse = null;
      window.addEventListener('mousemove', function (e) {
        mouse = { x: e.clientX, y: e.clientY };
      }, { passive: true });
      window.addEventListener('mouseout', function (e) {
        if (!e.relatedTarget) mouse = null;  // pointer left the window
      });

      var running = false, rafId = 0, last = 0;

      function frame(now) {
        var dt = Math.min((now - last) / 1000, 0.05) || 0.016;
        last = now;
        var rect = svg.getBoundingClientRect();
        var scale = rect.width / VIEW_W || 1;
        for (var i = 0; i < flags.length; i++) {
          var f = flags[i];
          var target = 0;
          if (mouse) {
            var dx = (mouse.x - rect.left) / scale - f.x;
            var dy = (mouse.y - rect.top) / scale - f.y;
            target = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
          }
          // ease toward the target so gusts swell and die down smoothly
          f.gust += (target - f.gust) * Math.min(1, dt * 5);
          var wind = 1 + 2 * f.gust;     // local wind-speed factor
          f.phase += dt * f.speed * wind;
          f.phase2 += dt * f.speed * 0.63 * wind;
          var amp = 2 + 3.8 * f.gust;    // sway (skew) amplitude, degrees — kept
                                         // small so flags flutter, not warp
          var a = Math.sin(f.phase) * amp + Math.sin(f.phase2) * amp * 0.35;
          // skewX in the flag's local frame keeps the glued top edge on the
          // string; the whisper of extra rotation stays hidden by the tuck
          f.use.setAttribute('transform',
            f.pre + 'rotate(' + (f.angle + a * 0.08).toFixed(2) + ')' + f.post +
            ' skewX(' + a.toFixed(2) + ')');
        }
        if (running) rafId = requestAnimationFrame(frame);
      }

      function start() {
        if (running) return;
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      }

      // only run the loop while the banner is on screen
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { start(); } else { stop(); }
        }).observe(banner);
      } else {
        start();
      }
    })();



/* ───────────────────────────────────────────────────────── */

    (function () {
      var form = document.getElementById('bookingForm');
      if (!form) return;

      var wrapper     = form.closest('.book-form-wrapper');
      var successBox  = wrapper.querySelector('[data-fs-success]');
      var errorBox    = wrapper.querySelector('[data-fs-error]');
      var submitBtn   = form.querySelector('[data-fs-submit-btn]');
      var emailInput  = document.getElementById('contact-email');
      var phoneInput  = document.getElementById('contact-phone');
      var emailError  = form.querySelector('[data-fs-error="email"]');

      // Bilingual micro-copy for messages this script generates.
      var MSG = {
        es: {
          invalidEmail: 'Por favor ingresa un correo electrónico válido.',
          sending:      'Enviando…',
          error:        'Algo salió mal. Inténtalo de nuevo o escríbenos a balletfolkloricomiherencia@gmail.com.'
        },
        en: {
          invalidEmail: 'Please enter a valid email address.',
          sending:      'Sending…',
          error:        'Something went wrong. Please try again or email us at balletfolkloricomiherencia@gmail.com.'
        },
        ja: {
          invalidEmail: '有効なメールアドレスをご入力ください。',
          sending:      '送信中…',
          error:        '送信に失敗しました。もう一度お試しいただくか、balletfolkloricomiherencia@gmail.com までご連絡ください。'
        },
        zh: {
          invalidEmail: '请输入有效的电子邮箱地址。',
          sending:      '发送中…',
          error:        '发送失败，请重试，或发送邮件至 balletfolkloricomiherencia@gmail.com 与我们联系。'
        }
      };
      function lang() {
        var c = (document.documentElement.lang || '').toLowerCase();
        if (c.indexOf('zh') === 0) return 'zh';
        if (c.indexOf('ja') === 0) return 'ja';
        if (c.indexOf('es') === 0) return 'es';
        return 'en';
      }
      function t(key) { return MSG[lang()][key]; }

      /* ── Phone number masking → (XXX) XXX-XXXX ──────────────── */
      function formatPhone(raw) {
        var d = raw.replace(/\D/g, '').slice(0, 10);
        if (d.length === 0) return '';
        if (d.length < 4)  return '(' + d;
        if (d.length < 7)  return '(' + d.slice(0, 3) + ') ' + d.slice(3);
        return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
      }
      function digitsBefore(str, pos) { return str.slice(0, pos).replace(/\D/g, '').length; }
      function caretForDigits(str, count) {
        if (count <= 0) return 0;
        var seen = 0;
        for (var i = 0; i < str.length; i++) {
          if (/\d/.test(str[i]) && ++seen === count) return i + 1;
        }
        return str.length;
      }
      if (phoneInput) {
        phoneInput.addEventListener('input', function () {
          var wanted = digitsBefore(this.value, this.selectionStart);
          this.value = formatPhone(this.value);
          var caret = caretForDigits(this.value, wanted);
          try { this.setSelectionRange(caret, caret); } catch (e) {}
        });
      }

      /* ── Live email validation (errors on blur, not just submit) ── */
      var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      function showEmailError() {
        if (emailError) emailError.textContent = t('invalidEmail');
        emailInput.setAttribute('aria-invalid', 'true');
      }
      function clearEmailError() {
        if (emailError) emailError.textContent = '';
        emailInput.removeAttribute('aria-invalid');
      }
      function emailIsValid() {
        var v = emailInput.value.trim();
        return v !== '' && EMAIL_RE.test(v);
      }
      if (emailInput) {
        emailInput.addEventListener('blur', function () {
          if (this.value.trim() === '') { clearEmailError(); return; }
          if (emailIsValid()) clearEmailError(); else showEmailError();
        });
        // Clear the error as soon as the visitor corrects it.
        emailInput.addEventListener('input', function () {
          if (emailInput.getAttribute('aria-invalid') === 'true' && emailIsValid()) clearEmailError();
        });
      }

      /* ── Submit feedback ─────────────────────────────────────── */
      function hideError() { if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; } }
      function showError(msg) {
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
        try { errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      }
      function onSuccess() {
        hideError();
        // Keep the framed card + gold corners; just swap fields for the celebration.
        form.classList.add('is-sent');
        if (successBox) {
          try { successBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        }
        form.reset();
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();

        // Surface our friendlier email message before the native check.
        if (emailInput && !emailIsValid() && emailInput.value.trim() !== '') showEmailError();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (emailInput && !emailIsValid()) { showEmailError(); emailInput.focus(); return; }

        var labelBefore = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.textContent = t('sending');

        function restoreBtn() {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          submitBtn.textContent = labelBefore;
        }

        // Best-effort copy to /team/; Formspree still sends the email.
        try {
          var payload = {};
          new FormData(form).forEach(function (v, k) { payload[k] = v; });
          payload.page = location.pathname;
          fetch('/api/inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(function () {});
        } catch (e) {}

        fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        }).then(function (res) {
          if (res.ok) { onSuccess(); return; }
          return res.json().then(function (data) {
            var msg = (data && data.errors && data.errors.length)
              ? data.errors.map(function (er) { return er.message; }).join(' ')
              : t('error');
            restoreBtn();
            showError(msg);
          });
        }).catch(function () {
          restoreBtn();
          showError(t('error'));
        });
      });
    })();
  

/* ───────────────────────────────────────────────────────── */

    (function () {
      var v = document.querySelector('.hero-video');
      if (!v) return;
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      function apply() {
        if (mq.matches) {
          v.removeAttribute('autoplay');
          v.pause();
        } else if (v.paused) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        }
      }
      apply();
      if (mq.addEventListener) mq.addEventListener('change', apply);
      else if (mq.addListener) mq.addListener(apply);
    })();
  

/* ───────────────────────────────────────────────────────── */

    (function () {
      var I = window.__I18N__;
      if (!I) return;
      function norm(c) {
        c = (c || '').toLowerCase();
        if (c === 'zht') return 'zht';
        if (c.indexOf('zh') === 0) {
          return /hant|-tw|-hk|-mo/.test(c) ? 'zht' : 'zh';
        }
        if (c.indexOf('ja') === 0) return 'ja';
        if (c.indexOf('es') === 0) return 'es';
        return 'en';
      }
      var page = norm(document.documentElement.lang);
      var pref = norm(navigator.language || navigator.userLanguage || '');
      if (pref === page || !I.meta[pref]) return;
      // Don't nag if they already have a language preference or dismissed the bar.
      try { if (localStorage.getItem('bfmh-lang') || localStorage.getItem('bfmh-suggest-dismissed')) return; } catch (e) {}
      var bar  = document.getElementById('langSuggest');
      var link = document.getElementById('langSuggestLink');
      if (!bar || !link) return;
      link.textContent = (I.suggest && I.suggest[pref]) || I.native[pref];
      link.setAttribute('href', I.meta[pref].path);
      link.setAttribute('lang', I.meta[pref].htmlLang);
      bar.hidden = false;
      var close = document.getElementById('langSuggestClose');
      if (close) close.addEventListener('click', function () {
        bar.hidden = true;
        try { localStorage.setItem('bfmh-suggest-dismissed', '1'); } catch (e) {}
      });
    })();
  
