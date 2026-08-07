/* ════════════════════════════════════════════════════════════
   LANDING PAGES — shared behavior (subset of app.js the landing
   pages need: no gallery/lightbox/i18n/event feeds).
   Used by /quinceaneras/ /weddings/ /pricing/ /dance-classes/
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Footer year ──
  var yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Sticky header shadow ──
  var header = document.querySelector('header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile hamburger menu ──
  var toggle = document.getElementById('mobileMenuToggle');
  var nav = document.getElementById('mobileNav');
  if (toggle && nav) {
    var openMenu = function () {
      nav.hidden = false;
      nav.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Cerrar menú de navegación');
    };
    var closeMenu = function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú de navegación');
      setTimeout(function () { nav.hidden = true; }, 260);
    };
    toggle.addEventListener('click', function () {
      toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
      }
    });
  }

  // ── Language switcher (same UI as the homepage) ──
  // Landing pages exist in English only, so picking a language navigates to
  // that language's homepage. The choice is stored exactly like app.js does,
  // so the root auto-detect and Vercel's edge redirect honor it afterwards.
  var sw = document.getElementById('langSwitch');
  var swBtn = document.getElementById('langSwitchBtn');
  var swMenu = document.getElementById('langSwitchMenu');
  if (sw && swBtn && swMenu) {
    var closeSwitch = function () { sw.classList.remove('open'); swBtn.setAttribute('aria-expanded', 'false'); };
    var openSwitch = function () { sw.classList.add('open'); swBtn.setAttribute('aria-expanded', 'true'); };
    swBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      sw.classList.contains('open') ? closeSwitch() : openSwitch();
    });
    document.addEventListener('click', function (e) { if (!sw.contains(e.target)) closeSwitch(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSwitch(); });
    swMenu.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lang]');
      if (!a) return;
      var chosen = a.getAttribute('data-lang');
      try { localStorage.setItem('bfmh-lang', chosen); } catch (e2) {}
      document.cookie = 'bfmh-lang=' + chosen + '; Max-Age=31536000; Path=/; SameSite=Lax';
      track('language_switch', { from: 'en', to: chosen });
      // No preventDefault: the link navigates to the chosen language's page.
    });
  }

  // ── Language suggestion bar (SEO-safe offer, never an auto-redirect).
  //    Unlike the homepage bar, these pages exist in every language at a
  //    /{lang}/{slug}/ URL, so we offer THIS page in the visitor's language
  //    (computed from the current path) rather than the homepage. ──
  (function () {
    var SUGGEST = {
      en:  { text: 'View this site in English',   htmlLang: 'en' },
      es:  { text: 'Ver este sitio en español',   htmlLang: 'es' },
      ja:  { text: 'このサイトを日本語で見る',      htmlLang: 'ja' },
      zh:  { text: '查看本网站的简体中文版',        htmlLang: 'zh-Hans' },
      zht: { text: '以繁體中文瀏覽本網站',          htmlLang: 'zh-Hant' }
    };
    var PREFIX = { es: 'es', ja: 'ja', zh: 'zh', zht: 'zh-hant' }; // path segment per lang
    function norm(c) {
      c = (c || '').toLowerCase();
      if (c === 'zht') return 'zht';
      if (c.indexOf('zh') === 0) return /hant|-tw|-hk|-mo/.test(c) ? 'zht' : 'zh';
      if (c.indexOf('ja') === 0) return 'ja';
      if (c.indexOf('es') === 0) return 'es';
      return 'en';
    }
    // Split the current path into (current language, page slug).
    var curLang = 'en';
    var slug = location.pathname.replace(/^\/|\/$/g, '');
    for (var k in PREFIX) {
      var seg = PREFIX[k];
      if (slug === seg || slug.indexOf(seg + '/') === 0) { curLang = k; slug = slug.slice(seg.length + 1); break; }
    }
    var pref = norm(navigator.language || navigator.userLanguage || '');
    if (!slug || pref === curLang || !SUGGEST[pref]) return; // already in their language
    // Don't nag if they already have a language preference or dismissed the bar.
    try { if (localStorage.getItem('bfmh-lang') || localStorage.getItem('bfmh-suggest-dismissed')) return; } catch (e) {}
    var bar = document.getElementById('langSuggest');
    var link = document.getElementById('langSuggestLink');
    if (!bar || !link) return;
    var target = pref === 'en' ? '/' + slug + '/' : '/' + PREFIX[pref] + '/' + slug + '/';
    link.textContent = SUGGEST[pref].text;
    link.setAttribute('href', target);
    link.setAttribute('lang', SUGGEST[pref].htmlLang);
    bar.hidden = false;
    var closeBar = document.getElementById('langSuggestClose');
    if (closeBar) closeBar.addEventListener('click', function () {
      bar.hidden = true;
      try { localStorage.setItem('bfmh-suggest-dismissed', '1'); } catch (e) {}
    });
  })();

  // ── Analytics events (no-ops until GA4/Clarity load) ──
  var page = (document.body && document.body.getAttribute('data-page')) || location.pathname;
  function track(name, params) {
    params = params || {};
    params.language = document.documentElement.lang || 'en';
    params.landing_page = page;
    if (typeof gtag === 'function') gtag('event', name, params);
    if (typeof window.clarity === 'function') {
      window.clarity('event', name);
      for (var k in params) window.clarity('set', k, String(params[k]));
    }
  }

  if (typeof window.clarity === 'function') window.clarity('set', 'landing_page', page);
  track('landing_page_view', {});

  // How far people scroll — fire once when each section first appears.
  var sections = document.querySelectorAll('main section[id]');
  if ('IntersectionObserver' in window && sections.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          track('section_view', { section: entry.target.id });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { io.observe(s); });
  }

  // Quote intent — CTA clicks and actual form submits.
  document.querySelectorAll('a[href="#quote"], a[href$="#contact"]').forEach(function (el) {
    el.addEventListener('click', function () { track('contact_cta_click', {}); });
  });
  var form = document.getElementById('quoteForm');
  if (form) {
    form.addEventListener('submit', function () { track('quote_form_submit', {}); });
  }
})();
