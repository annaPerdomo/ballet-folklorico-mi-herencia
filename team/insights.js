/* Owners answer clients by email, outside the app: never show reply times, only the outcome
   recorded here. English only — Anna is the one reader. */
(function () {
  'use strict';

  var TZ = 'America/Los_Angeles';
  var DAY = 86400000;
  var PREFS_KEY = 'bfmh_admin_insights';
  var VIEWS = [['overview', 'Overview'], ['inquiries', 'Inquiries'], ['gallery', 'Gallery & app'], ['families', 'Families'], ['gigs', 'Gigs']];
  var WINDOWS = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];
  // Stack order is the validated one (adjacent pairs pass CVD + normal-vision on the card surface).
  var OUTCOMES = [
    { key: 'booked', label: 'Booked', color: '#199e70' },
    { key: 'pending', label: 'Pending', color: '#c98500' },
    { key: 'lapsed', label: 'Date passed', color: '#3987e5' },
    { key: 'declined', label: 'Declined / cancelled', color: '#d95926' },
    { key: 'hidden', label: 'Hidden', color: 'rgba(255,255,255,0.3)' },
  ];
  var KINDS = [{ key: 'photo', label: 'Photos', color: '#3987e5' }, { key: 'video', label: 'Videos', color: '#d95926' }, { key: 'link', label: 'YouTube', color: '#199e70' }];
  var CHANNELS = [{ key: 'app', label: 'App', color: '#3987e5' }, { key: 'chona', label: 'La Chona', color: '#d95926' }, { key: 'owner', label: 'Ramirez family', color: '#199e70' }, { key: 'anna', label: 'You', color: '#c98500' }];
  var TAB_NAMES = { inbox: 'Inbox', gigs: 'Gigs', feed: 'Feed', media: 'Gallery', team: 'Team', chona: 'La Chona' };
  var LANGS = { es: 'Spanish', ja: 'Japanese', zh: 'Chinese (Simplified)', 'zh-hant': 'Chinese (Traditional)', en: 'English' };
  var PAGES = { '/': 'Home page', '/quinceaneras/': 'Quinceañeras page', '/weddings/': 'Weddings page', '/pricing/': 'Pricing page',
    '/dance-classes/': 'Dance classes page', '/school-assemblies/': 'School assemblies page' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var S = loadPrefs();
  S.data = null; S.loading = null; S.error = null; S.locked = false; S.open = null; S.q = '';
  var ctx, h, root;

  function loadPrefs() {
    var d = { view: 'overview', days: 30, status: 'all', type: 'all', famSort: 'name' };
    try {
      var v = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (VIEWS.some(function (x) { return x[0] === v.view; })) d.view = v.view;
      if (WINDOWS.some(function (x) { return x[0] === v.days; })) d.days = v.days;
      if (typeof v.famSort === 'string') d.famSort = v.famSort;
    } catch (e) {}
    return d;
  }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ view: S.view, days: S.days, famSort: S.famSort })); } catch (e) {} }

  function load(force) {
    if (S.loading && !force) return S.loading;
    S.error = null;
    var days = S.days;
    var req = S.loading = ctx.api('/api/me?insights&days=' + days).then(function (d) {
      if (S.loading !== req || days !== S.days) return;
      S.data = prepare(d); S.locked = false; S.loading = null; paint();
    }, function (e) {
      if (S.loading !== req) return;
      S.loading = null;
      if (e.status === 403 || e.status === 401) S.locked = true; else S.error = e.message;
      paint();
    });
    return S.loading;
  }

  function prepare(d) {
    var seen = {};
    d.inquiries.slice().reverse().forEach(function (r) {
      var key = (r.client_email || r.client_phone || r.client_name || '').toLowerCase().trim();
      r.repeat = key ? (seen[key] = (seen[key] || 0) + 1) - 1 : 0;
    });
    d.inquiries.forEach(function (r) {
      r.at = new Date(r.created_at);
      r.outcome = outcomeOf(r.status);
      r.pt = pt(r.at);
      r.lang = langOf(r.page);
      r.landing = landingOf(r.page);
      r.leadDays = r.event_date ? Math.round((dateOnly(r.event_date) - dateOnly(r.pt.iso)) / DAY) : null;
    });
    return d;
  }
  function outcomeOf(st) {
    if (['open', 'confirmed', 'done', 'merged'].indexOf(st) >= 0) return 'booked';
    if (st === 'inquiry') return 'pending';
    if (st === 'lapsed') return 'lapsed';
    if (st === 'deleted') return 'hidden';
    return 'declined';
  }
  function langOf(page) {
    var m = /^\/(es|ja|zh-hant|zh)(\/|$)/.exec(page || '');
    return page ? (m ? m[1] : 'en') : null;
  }
  function landingOf(page) {
    if (!page) return null;
    var p = page.replace(/^\/(es|ja|zh-hant|zh)(?=\/|$)/, '') || '/';
    if (!/\/$/.test(p)) p += '/';
    return PAGES[p] || p;
  }

  var ptFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' });
  function pt(date) {
    var p = {}; ptFmt.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, hour: +p.hour % 24, dow: DOWS.indexOf(p.weekday), iso: p.year + '-' + p.month + '-' + p.day };
  }
  function dateOnly(iso) { var p = String(iso).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function monthKey(y, m) { return y + '-' + ('0' + m).slice(-2); }
  function monthLabel(key, withYear) { var p = key.split('-'); return MONTHS[+p[1] - 1] + (withYear ? ' ’' + p[0].slice(2) : ''); }
  function monthsBetween(from, to) {
    var out = [], y = +from.slice(0, 4), m = +from.slice(5, 7);
    while (monthKey(y, m) <= to) { out.push(monthKey(y, m)); if (++m > 12) { m = 1; y++; } }
    return out;
  }
  function fmtDay(iso) { var p = String(iso).slice(0, 10).split('-'); return MONTHS[+p[1] - 1] + ' ' + +p[2] + ', ' + p[0]; }
  function fmtShortDay(iso) { var p = String(iso).slice(0, 10).split('-'); return MONTHS[+p[1] - 1] + ' ' + +p[2]; }
  function ago(iso) {
    if (!iso) return 'never';
    var s = (Date.now() - new Date(iso)) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    if (s < 86400 * 45) return Math.round(s / 86400) + ' d ago';
    return fmtShortDay(new Date(iso).toISOString());
  }
  function fmtHours(hrs) {
    if (hrs == null || isNaN(hrs)) return '—';
    if (hrs < 1) return Math.max(1, Math.round(hrs * 60)) + ' min';
    if (hrs < 48) return (hrs < 10 ? hrs.toFixed(1) : Math.round(hrs)) + ' h';
    return Math.round(hrs / 24) + ' days';
  }
  function median(list) {
    var a = list.filter(function (v) { return v != null && !isNaN(v); }).sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }
  function pct(n, d) { return d ? Math.round((n / d) * 100) + '%' : '—'; }
  function fmtBytes(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : Math.max(0, Math.round(b / 1048576)) + ' MB'; }
  function sum(list, f) { return list.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  function countBy(list, f) {
    var m = {}; list.forEach(function (x) { var k = f(x); if (k != null) m[k] = (m[k] || 0) + 1; }); return m;
  }
  function inWindow(at, days, offset) {
    var now = Date.now(), lo = now - (offset + 1) * days * DAY, hi = now - offset * days * DAY;
    return at >= lo && at < hi;
  }

  function render(el, c) {
    ctx = c; h = c.h; root = el;
    paint();
    if (!S.data && !S.loading && !S.locked) load();
  }

  function paint() {
    if (!root || !root.isConnected) return;
    var keep = root.closest('.tm-main'), top = keep ? keep.scrollTop : 0;
    root.innerHTML = '';
    hideTip();
    if (S.locked) return root.appendChild(unlockForm());
    root.appendChild(header());
    if (S.error) return root.appendChild(ctx.emptyState('refresh', S.error, h('button', { class: 'btn btn-sm btn-gold', text: 'Try again', onclick: function () { load(true); } })));
    if (!S.data) return root.appendChild(ctx.loader('Crunching the numbers…'));
    var body = h('div', { class: 'ins-body' + (S.loading ? ' is-stale' : '') });
    root.appendChild(body);
    ({ overview: viewOverview, inquiries: viewInquiries, gallery: viewGallery, families: viewFamilies, gigs: viewGigs })[S.view](body, S.data);
    if (keep) keep.scrollTop = top;
  }

  function header() {
    var d = S.data;
    var nav = h('div', { class: 'ins-nav', role: 'tablist' });
    VIEWS.forEach(function (v) {
      nav.appendChild(h('button', { type: 'button', role: 'tab', class: 'ins-navbtn' + (S.view === v[0] ? ' is-on' : ''), 'aria-selected': S.view === v[0] ? 'true' : 'false',
        text: v[1], onclick: function () { S.view = v[0]; S.open = null; savePrefs(); paint(); var m = root.closest('.tm-main'); if (m) m.scrollTop = 0; } }));
    });
    var range = h('div', { class: 'ins-range', role: 'group', 'aria-label': 'Time window' });
    WINDOWS.forEach(function (w) {
      range.appendChild(h('button', { type: 'button', class: 'fchip' + (S.days === w[0] ? ' is-on' : ''), 'aria-pressed': S.days === w[0] ? 'true' : 'false', text: w[1],
        onclick: function () { if (S.days === w[0]) return; S.days = w[0]; savePrefs(); load(true); paint(); } }));
    });
    return h('div', { class: 'ins-head' },
      h('div', { class: 'ins-titlebar' },
        h('h1', { class: 'ins-title', text: 'Insights' }),
        h('span', { class: 'ins-updated', text: S.loading ? 'Updating…' : d ? 'Updated ' + ago(d.generated_at) : '' }),
        h('button', { type: 'button', class: 'btn btn-sm btn-icon', 'aria-label': 'Refresh', title: 'Refresh', onclick: function () { load(true); paint(); } }, ctx.icon('refresh', 2.2))),
      nav, range);
  }

  function unlockForm() {
    var err = h('p', { class: 'error' });
    var pw = h('input', { type: 'password', name: 'password', autocomplete: 'current-password', placeholder: 'Admin password' });
    var who = h('input', { type: 'text', name: 'username', autocomplete: 'username', value: 'Admin', 'aria-hidden': 'true', tabindex: '-1' });
    return h('form', { class: 'login', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      ctx.api('/api/auth', { method: 'POST', body: { password: pw.value } }).then(function (r) {
        if (r.insights) location.reload();
        else err.textContent = 'That’s the team password. Insights needs your admin password.';
      }).catch(function (x) { err.textContent = x.message; });
    } },
      h('h1', { text: 'Insights are locked' }),
      h('p', { text: 'Enter your admin password to see analytics. The team password doesn’t open this.' }),
      h('label', { class: 'f f-hidden' }, 'Name', who),
      h('label', { class: 'f' }, 'Admin password', pw),
      h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: 'Unlock' })),
      err,
      ctx.me && ctx.me.insights_configured === false ? h('p', { class: 'hint', text: 'INSIGHTS_PASSWORD isn’t set on the server yet. Add it on Vercel, then redeploy.' }) : null);
  }

  function card(title, sub, body, opts) {
    opts = opts || {};
    return h('section', { class: 'ins-card' + (opts.wide ? ' is-wide' : '') + (opts.cls ? ' ' + opts.cls : '') },
      title ? h('header', { class: 'ins-card-head' }, h('h3', { class: 'ins-card-title', text: title }), opts.action || null) : null,
      sub ? h('p', { class: 'ins-card-sub', text: sub }) : null,
      body);
  }
  function grid() { return h('div', { class: 'ins-grid' }); }
  function kpis(list) {
    var row = h('div', { class: 'ins-kpis' });
    list.forEach(function (k) {
      var delta = null;
      if (k.prev != null && k.value != null && typeof k.raw === 'number') {
        var diff = k.raw - k.prev;
        if (k.prev === 0 && k.raw === 0) delta = null;
        else delta = h('span', { class: 'ins-delta ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat') },
          (diff > 0 ? '▲ ' : diff < 0 ? '▼ ' : '') + (k.prev ? Math.abs(Math.round((diff / k.prev) * 100)) + '%' : '+' + diff) + ' vs prior');
      }
      row.appendChild(h('div', { class: 'ins-kpi' + (k.alert ? ' is-alert' : '') },
        h('span', { class: 'ins-kpi-label', text: k.label }),
        h('span', { class: 'ins-kpi-value', text: k.value == null ? '—' : String(k.value) }),
        h('span', { class: 'ins-kpi-sub' }, delta, k.sub ? h('span', { text: k.sub }) : null)));
    });
    return row;
  }
  function legend(series) {
    if (series.length < 2) return null;
    return h('div', { class: 'ins-legend' }, series.map(function (s) {
      return h('span', { class: 'ins-key' }, h('i', { style: 'background:' + s.color }), s.label);
    }));
  }
  function emptyNote(text) { return h('p', { class: 'ins-empty', text: text }); }

  function hbars(rows, opts) {
    opts = opts || {};
    if (!rows.length) return emptyNote(opts.empty || 'Nothing yet.');
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; })) || 1;
    var list = h('ol', { class: 'ins-hbars' });
    rows.forEach(function (r) {
      var bar = h('span', { class: 'ins-hbar-track' });
      if (r.parts) {
        r.parts.forEach(function (p) { if (p.value) bar.appendChild(h('i', { class: 'ins-hbar-fill', style: 'width:' + (p.value / max * 100) + '%;background:' + p.color, title: p.label + ': ' + p.value })); });
      } else bar.appendChild(h('i', { class: 'ins-hbar-fill', style: 'width:' + Math.max(r.value ? 1.5 : 0, r.value / max * 100) + '%' + (r.color ? ';background:' + r.color : '') }));
      var el = h(r.onclick ? 'button' : 'div', { class: 'ins-hbar', type: r.onclick ? 'button' : null, onclick: r.onclick || null },
        h('span', { class: 'ins-hbar-label' }, r.thumb ? h('img', { class: 'ins-hbar-thumb', src: r.thumb, alt: '', loading: 'lazy' }) : null, h('span', { text: r.label })),
        h('span', { class: 'ins-hbar-value', text: opts.fmt ? opts.fmt(r.value, r) : String(r.value) }),
        bar,
        r.sub ? h('span', { class: 'ins-hbar-sub', text: r.sub }) : null);
      list.appendChild(h('li', null, el));
    });
    return h('div', null, opts.legend ? legend(opts.legend) : null, list);
  }

  /* Drawn at the measured width, not a scaled viewBox, so axis text stays 11px on a phone. */
  function columns(cats, series, opts) {
    opts = opts || {};
    var wrap = h('div', { class: 'ins-chart' });
    var plot = h('div', { class: 'ins-plot', style: 'height:' + (opts.height || 190) + 'px' });
    var totals = cats.map(function (_, i) { return sum(series, function (s) { return s.values[i] || 0; }); });
    var empty = !sum(totals);
    wrap.appendChild(legend(series) || h('span'));
    wrap.appendChild(empty ? emptyNote(opts.empty || 'Nothing in this period yet.') : plot);
    if (!empty) {
      mount(plot, function (W, H) { return drawColumns(W, H, cats, series, totals, opts); });
      wrap.appendChild(dataTable([''].concat(series.length > 1 ? series.map(function (s) { return s.label; }).concat(['Total']) : [opts.valueLabel || 'Count']),
        cats.map(function (c, i) { return [opts.label ? opts.label(c, true) : c].concat(series.length > 1 ? series.map(function (s) { return s.values[i] || 0; }).concat([totals[i]]) : [totals[i]]); })));
    }
    return wrap;
  }
  function mount(el, draw) {
    var last = 0;
    function go() {
      var W = Math.round(el.clientWidth); if (!W || W === last) return; last = W;
      el.innerHTML = ''; el.appendChild(draw(W, el.clientHeight));
    }
    requestAnimationFrame(go);
    if (window.ResizeObserver) new ResizeObserver(go).observe(el);
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  }
  function niceMax(v) {
    if (v <= 4) return Math.max(1, Math.ceil(v));
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function drawColumns(W, H, cats, series, totals, opts) {
    var padL = 30, padR = 4, padT = 8, padB = 22;
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'ins-svg', role: 'img', 'aria-label': opts.aria || 'Chart' });
    var max = niceMax(Math.max.apply(null, totals));
    var plotW = W - padL - padR, plotH = H - padT - padB, n = cats.length;
    var step = plotW / n, bw = Math.max(2, Math.min(36, step * 0.72));
    var y = function (v) { return padT + plotH - (v / max) * plotH; };
    var ticks = max <= 4 ? Array.from({ length: max + 1 }, function (_, i) { return i; }) : [0, max / 2, max];
    ticks.forEach(function (t) {
      svg('line', { x1: padL, x2: W - padR, y1: y(t), y2: y(t), class: t ? 'ins-grid-line' : 'ins-base-line' }, s);
      var lab = svg('text', { x: padL - 6, y: y(t) + 4, 'text-anchor': 'end', class: 'ins-axis' }, s); lab.textContent = fmtTick(t);
    });
    var every = Math.ceil(n / Math.max(1, Math.floor(plotW / 44)));
    cats.forEach(function (c, i) {
      var x = padL + step * i + (step - bw) / 2, base = 0, segs = [];
      series.forEach(function (se) { var v = se.values[i] || 0; if (v) segs.push({ v: v, color: se.color, from: base }); base += v; });
      segs.forEach(function (g, j) {
        var top = y(g.from + g.v), bot = y(g.from);
        var hgt = Math.max(1, bot - top - (j ? 2 : 0));
        var last = j === segs.length - 1;
        svg('path', { d: barPath(x, top, bw, hgt, last ? Math.min(4, bw / 2, hgt) : 0), fill: g.color }, s);
      });
      if (i % every === 0 || i === n - 1 && n < 8) {
        var tx = svg('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'ins-axis' }, s);
        tx.textContent = opts.label ? opts.label(c) : c;
      }
      var hit = svg('rect', { x: padL + step * i, y: padT, width: step, height: plotH, class: 'ins-hit', tabindex: 0 }, s);
      var tip = function (e) {
        var lines = series.length > 1 ? series.filter(function (se) { return se.values[i]; }).map(function (se) { return [se.label, se.values[i], se.color]; }) : [];
        showTip(e, (opts.label ? opts.label(c, true) : c), (opts.tipTotal ? opts.tipTotal(totals[i], i) : totals[i] + (opts.unit ? ' ' + opts.unit : '')), lines, hit);
      };
      hit.addEventListener('pointerenter', tip); hit.addEventListener('pointermove', tip); hit.addEventListener('focus', tip);
      hit.addEventListener('pointerleave', hideTip); hit.addEventListener('blur', hideTip);
      if (opts.onclick) { hit.style.cursor = 'pointer'; hit.addEventListener('click', function () { opts.onclick(c, i); }); }
    });
    return s;
  }
  function barPath(x, y, w, hgt, r) {
    if (!r) return 'M' + x + ' ' + (y + hgt) + 'V' + y + 'H' + (x + w) + 'V' + (y + hgt) + 'Z';
    return 'M' + x + ' ' + (y + hgt) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + hgt) + 'Z';
  }
  function fmtTick(v) { return v >= 1000 ? (v / 1000) + 'k' : String(Math.round(v * 10) / 10); }

  var tipEl = null;
  function showTip(e, title, value, lines, anchor) {
    if (!tipEl) { tipEl = h('div', { class: 'ins-tip', role: 'status' }); document.body.appendChild(tipEl); }
    tipEl.innerHTML = '';
    tipEl.appendChild(h('b', { text: title }));
    tipEl.appendChild(h('span', { class: 'ins-tip-total', text: String(value) }));
    (lines || []).forEach(function (l) { tipEl.appendChild(h('span', { class: 'ins-tip-line' }, h('i', { style: 'background:' + l[2] }), l[0] + ': ' + l[1])); });
    tipEl.hidden = false;
    var r = anchor.getBoundingClientRect();
    var x = e && e.clientX != null ? e.clientX : r.left + r.width / 2, yy = r.top;
    var tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    tipEl.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, x - tw / 2)) + 'px';
    tipEl.style.top = Math.max(8, yy - th - 6) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }

  function heatmap(cells, opts) {
    opts = opts || {};
    var grid = []; for (var d = 0; d < 7; d++) grid.push(new Array(24).fill(0));
    cells.forEach(function (c) { grid[c.dow][c.hour] += c.n; });
    var max = Math.max.apply(null, grid.map(function (r) { return Math.max.apply(null, r); }));
    if (!max) return emptyNote(opts.empty || 'Nothing in this period yet.');
    var el = h('div', { class: 'ins-heat', role: 'table', 'aria-label': opts.aria || 'By day and hour' });
    el.appendChild(h('span', { class: 'ins-heat-corner' }));
    for (var hr = 0; hr < 24; hr++) el.appendChild(h('span', { class: 'ins-heat-hr', text: hr % 6 === 0 ? (hr === 0 ? '12a' : hr === 12 ? '12p' : hr < 12 ? hr + 'a' : (hr - 12) + 'p') : '' }));
    [1, 2, 3, 4, 5, 6, 0].forEach(function (dw) {
      el.appendChild(h('span', { class: 'ins-heat-day', text: DOWS[dw] }));
      for (var hr2 = 0; hr2 < 24; hr2++) {
        var v = grid[dw][hr2];
        var cell = h('span', { class: 'ins-heat-cell', tabindex: v ? 0 : null, style: v ? 'background:rgba(232,201,122,' + (0.18 + 0.82 * v / max).toFixed(2) + ')' : '' });
        (function (cellEl, dayName, hour, val) {
          var tip = function (e) { showTip(e, dayName + ' ' + hourLabel(hour), val + ' ' + (opts.unit || ''), [], cellEl); };
          cellEl.addEventListener('pointerenter', tip); cellEl.addEventListener('focus', tip);
          cellEl.addEventListener('pointerleave', hideTip); cellEl.addEventListener('blur', hideTip);
        })(cell, DOWS[dw], hr2, v);
        el.appendChild(cell);
      }
    });
    var busiest = [];
    grid.forEach(function (r, dw) { r.forEach(function (v, hr) { if (v) busiest.push({ dw: dw, hr: hr, v: v }); }); });
    busiest.sort(function (a, b) { return b.v - a.v; });
    var byDay = grid.map(function (r, i) { return { i: i, v: sum(r) }; }).sort(function (a, b) { return b.v - a.v; });
    return h('div', null, el, h('p', { class: 'ins-note', text: 'Busiest: ' + DOWS[byDay[0].i] + 's, around ' + hourLabel(busiest[0].hr) + ' (Pacific).' }));
  }
  function hourLabel(hr) { return hr === 0 ? '12 am' : hr === 12 ? '12 pm' : hr < 12 ? hr + ' am' : (hr - 12) + ' pm'; }

  function dataTable(head, rows) {
    return h('details', { class: 'ins-data' }, h('summary', { text: 'Show as table' }),
      h('div', { class: 'ins-table-wrap' }, h('table', { class: 'ins-table' },
        h('thead', null, h('tr', null, head.map(function (c) { return h('th', { text: c }); }))),
        h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', { text: String(c) }); })); })))));
  }
  function meter(used, total, label) {
    var p = total ? Math.min(100, used / total * 100) : 0;
    return h('div', { class: 'ins-meter' + (p > 85 ? ' is-high' : '') },
      h('div', { class: 'ins-meter-track' }, h('i', { style: 'width:' + p + '%' })),
      h('span', { class: 'ins-meter-label', text: label }));
  }

  function windowed(list, offset) { return list.filter(function (r) { return inWindow(r.at.getTime(), S.days, offset || 0); }); }
  function monthlyOutcomes(list) {
    if (!list.length) return { cats: [], series: [] };
    var first = list.reduce(function (m, r) { var k = monthKey(r.pt.y, r.pt.m); return k < m ? k : m; }, '9999-99');
    var now = pt(new Date()), cats = monthsBetween(first, monthKey(now.y, now.m));
    var idx = {}; cats.forEach(function (c, i) { idx[c] = i; });
    var series = OUTCOMES.map(function (o) { return { key: o.key, label: o.label, color: o.color, values: cats.map(function () { return 0; }) }; });
    list.forEach(function (r) { var s = series.find(function (x) { return x.key === r.outcome; }); s.values[idx[monthKey(r.pt.y, r.pt.m)]]++; });
    return { cats: cats, series: series };
  }
  function outcomeParts(list) {
    var c = countBy(list, function (r) { return r.outcome; });
    return OUTCOMES.map(function (o) { return { label: o.label, value: c[o.key] || 0, color: o.color }; });
  }
  function groupRows(list, keyOf, labelOf, limit) {
    var groups = {};
    list.forEach(function (r) { var k = keyOf(r); if (k == null || k === '') k = '—'; (groups[k] = groups[k] || []).push(r); });
    return Object.keys(groups).map(function (k) {
      var g = groups[k], booked = g.filter(function (r) { return r.outcome === 'booked'; }).length;
      return { label: labelOf ? labelOf(k) : k, value: g.length, parts: outcomeParts(g), sub: booked + ' booked · ' + pct(booked, g.length) };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, limit || 99);
  }
  function leadBuckets(list) {
    var B = [['No date given', null], ['Under 2 weeks', 14], ['2–4 weeks', 30], ['1–2 months', 61], ['2–3 months', 92], ['3–6 months', 183], ['6+ months', Infinity]];
    var rows = B.map(function (b) { return { label: b[0], value: 0, g: [] }; });
    list.forEach(function (r) {
      var i = r.leadDays == null ? 0 : B.findIndex(function (b, j) { return j > 0 && r.leadDays < b[1]; });
      rows[i < 0 ? B.length - 1 : i].g.push(r);
    });
    return rows.map(function (r) { var booked = r.g.filter(function (x) { return x.outcome === 'booked'; }).length;
      return { label: r.label, value: r.g.length, parts: outcomeParts(r.g), sub: r.g.length ? booked + ' booked · ' + pct(booked, r.g.length) : '' }; });
  }

  function viewOverview(body, d) {
    var inq = d.inquiries, cur = windowed(inq), prev = windowed(inq, 1);
    var u = d.usage, famIds = d.families.map(function (f) { return f.id; });
    var activeFamilies = u.families.filter(function (f) { return (f.opens || f.views) && famIds.indexOf(f.family_id) >= 0; }).length;
    var views = sum(u.actions.filter(function (a) { return a.action === 'view' && a.role === 'member'; }), function (a) { return a.n; });
    var booked = inq.filter(function (r) { return r.outcome === 'booked'; }).length;
    var decided = inq.filter(function (r) { return r.outcome !== 'pending' && r.outcome !== 'hidden'; }).length;
    body.appendChild(kpis([
      { label: 'Website inquiries', value: cur.length, raw: cur.length, prev: prev.length, sub: 'last ' + windowName() },
      { label: 'Booking rate', value: pct(booked, decided), sub: booked + ' of ' + decided + ' decided, all time (hidden left out)' },
      { label: 'Still undecided', value: inq.filter(function (r) { return r.outcome === 'pending'; }).length, sub: 'not yet booked or declined in the app' },
      { label: 'Active families', value: activeFamilies + ' / ' + d.families.length, sub: 'opened the app, last ' + windowName() },
      { label: 'Gallery views', value: views, sub: 'by families, last ' + windowName() },
      { label: 'New uploads', value: d.recent_uploads, sub: 'last 30 days' },
    ]));

    var g = grid(); body.appendChild(g);
    g.appendChild(card('Needs attention', null, attention(d), { cls: 'ins-attn' }));
    g.appendChild(card('Latest inquiries', null, latest(inq.slice(0, 5)), { action: linkTo('inquiries', 'All') }));
    var mo = monthlyOutcomes(inq);
    g.appendChild(card('Website inquiries by month', 'Every form submission since the inbox started, colored by how it ended.',
      columns(mo.cats, mo.series, { label: monthShort(mo.cats), aria: 'Inquiries by month', unit: 'inquiries' }), { wide: true, action: linkTo('inquiries', 'All inquiries') }));
    g.appendChild(card('App activity', 'App opens per day, everyone together' + trackingSince(u), dailyChart(u), { wide: true, action: linkTo('gallery', 'Details') }));
    var upcoming = d.gigs.filter(function (x) { return ['open', 'confirmed'].indexOf(x.status) >= 0 && x.event_date && x.event_date >= pt(new Date()).iso; })
      .sort(function (a, b) { return a.event_date.localeCompare(b.event_date); }).slice(0, 6);
    g.appendChild(card('Upcoming headcount', null, hbars(upcoming.map(function (x) {
      return { label: fmtShortDay(x.event_date) + ' · ' + (x.title || 'Gig'), value: x.yes, color: x.dancers_needed && x.yes >= x.dancers_needed ? '#199e70' : null,
        sub: (x.dancers_needed ? x.yes + ' of ' + x.dancers_needed + ' needed' : x.yes + ' going') + ' · ' + x.answers + ' of ' + d.roster + ' answered' + (x.status === 'open' ? ' · not confirmed' : ''),
        onclick: ctx.hasEvent(x.id) ? function () { ctx.openEvent(x.id); } : null };
    }), { empty: 'No gigs coming up.' })));
    g.appendChild(card('Busiest gallery folders', 'Opened the most, last ' + windowName(), hbars(u.galleries.slice(0, 5).map(galleryRow), { empty: emptyUsage(u) })));
  }

  function attention(d) {
    var items = [];
    var stale = d.inquiries.filter(function (r) { return r.status === 'inquiry' && Date.now() - r.at > 14 * DAY && !(r.event_date && r.event_date >= pt(new Date()).iso && dateOnly(r.event_date) - dateOnly(pt(new Date()).iso) < 21 * DAY); });
    if (stale.length) items.push(['mail', stale.length + ' inquir' + (stale.length === 1 ? 'y is' : 'ies are') + ' still undecided after 2+ weeks', 'Mayra and Angel may have settled these by email; marking them booked or declined keeps the stats right. ' + stale.map(function (r) { return r.client_name || r.client_email; }).slice(0, 4).join(', '), function () { S.view = 'inquiries'; S.status = 'pending'; paint(); }]);
    var soon = d.inquiries.filter(function (r) { return r.status === 'inquiry' && r.leadDays != null && r.event_date >= pt(new Date()).iso && dateOnly(r.event_date) - dateOnly(pt(new Date()).iso) < 21 * DAY; });
    if (soon.length) items.push(['clock', soon.length + ' pending inquir' + (soon.length === 1 ? 'y is' : 'ies are') + ' for the next 3 weeks', soon.map(function (r) { return fmtShortDay(r.event_date) + ' ' + (r.client_name || ''); }).join(', '), function () { S.view = 'inquiries'; S.status = 'pending'; paint(); }]);
    var sugg = sum(d.gallery.totals, function (t) { return t.suggested; });
    if (sugg) items.push(['website', sugg + ' photo' + (sugg === 1 ? '' : 's') + ' suggested for the website', 'Approve them on the Gallery tab', null]);
    if (d.gallery.quota && d.gallery.used / d.gallery.quota > 0.8) items.push(['image', 'Gallery storage is ' + pct(d.gallery.used, d.gallery.quota) + ' full', fmtBytes(d.gallery.used) + ' of ' + fmtBytes(d.gallery.quota), null]);
    var tracked = d.usage.since && Date.now() - new Date(d.usage.since) > 14 * DAY;
    if (tracked) {
      var quiet = d.families.filter(function (f) { return !f.last_seen || Date.now() - new Date(f.last_seen) > 30 * DAY; });
      if (quiet.length) items.push(['people', quiet.length + ' famil' + (quiet.length === 1 ? 'y hasn’t' : 'ies haven’t') + ' opened the app in 30 days', quiet.map(function (f) { return f.name; }).slice(0, 5).join(', '), function () { S.view = 'families'; S.famSort = 'seen'; paint(); }]);
    }
    var open = d.gigs.filter(function (x) { return x.status === 'open' && x.event_date && x.event_date >= pt(new Date()).iso && x.answers < d.roster; });
    if (open.length) items.push(['calendar', open.length + ' open gig' + (open.length === 1 ? ' is' : 's are') + ' still missing answers', open.map(function (x) { return (x.title || 'Gig') + ' (' + (d.roster - x.answers) + ' out)'; }).slice(0, 3).join(', '), null]);
    if (!items.length) return h('p', { class: 'ins-allclear' }, ctx.icon('allDone', 2), 'All clear. Nothing is waiting on anyone.');
    return h('ul', { class: 'ins-attn-list' }, items.map(function (it) {
      return h('li', null, h(it[3] ? 'button' : 'div', { class: 'ins-attn-item', type: it[3] ? 'button' : null, onclick: it[3] },
        h('span', { class: 'ins-attn-ico' }, ctx.icon(it[0], 2)), h('span', null, h('b', { text: it[1] }), h('small', { text: it[2] }))));
    }));
  }

  function latest(list) {
    if (!list.length) return emptyNote('No inquiries yet.');
    return h('ul', { class: 'ins-latest' }, list.map(function (r) {
      var o = OUTCOMES.find(function (x) { return x.key === r.outcome; });
      return h('li', null, h('button', { type: 'button', class: 'ins-latest-row', onclick: function () {
        S.view = 'inquiries'; S.open = r.id; S.status = 'all'; S.type = 'all'; S.month = null; S.q = ''; savePrefs(); paint();
        var el = root.querySelector('.ins-row.is-open'); if (el) el.scrollIntoView({ block: 'center' });
      } },
        h('span', { class: 'ins-row-main' }, h('b', { text: r.client_name || r.client_email || 'No name' }),
          h('small', { text: [ctx.typeLabel(r.event_type || 'other'), r.event_date ? 'for ' + fmtDay(r.event_date) : null, 'sent ' + ago(r.created_at)].filter(Boolean).join(' · ') })),
        h('span', { class: 'ins-status' }, h('i', { style: 'background:' + o.color }), statusName(r.status))));
    }));
  }

  function viewInquiries(body, d) {
    var all = d.inquiries, cur = windowed(all), prev = windowed(all, 1);
    var decided = cur.filter(function (r) { return r.outcome !== 'pending' && r.outcome !== 'hidden'; });
    var booked = cur.filter(function (r) { return r.outcome === 'booked'; });
    body.appendChild(kpis([
      { label: 'Inquiries', value: cur.length, raw: cur.length, prev: prev.length, sub: 'last ' + windowName() },
      { label: 'Booked', value: booked.length, sub: pct(booked.length, decided.length) + ' of decided' },
      { label: 'Still undecided', value: cur.filter(function (r) { return r.outcome === 'pending'; }).length, sub: 'not booked or declined in the app' },
      { label: 'Booked ahead', value: (function (m) { return m == null ? null : m + ' days'; })(median(cur.map(function (r) { return r.leadDays; }))), sub: 'median, submit → event' },
      { label: 'Repeat clients', value: cur.filter(function (r) { return r.repeat; }).length, sub: 'came back for another event' },
      { label: 'All time', value: all.length, sub: 'since ' + (all.length ? fmtShortDay(all[all.length - 1].pt.iso) + ', ' + all[all.length - 1].pt.y : '—') },
    ]));
    var g = grid(); body.appendChild(g);
    var mo = monthlyOutcomes(all);
    g.appendChild(card('By month, all time', 'Tap a month to list its inquiries.', columns(mo.cats, mo.series, {
      label: monthShort(mo.cats), unit: 'inquiries', aria: 'Inquiries by month',
      onclick: function (c) { S.month = c; S.status = 'all'; paint(); var t = root.querySelector('.ins-list'); if (t) t.scrollIntoView({ behavior: 'smooth' }); } }), { wide: true }));
    g.appendChild(card('Where they end up', 'Last ' + windowName(), funnel(cur)));
    g.appendChild(card('What they ask for', 'Last ' + windowName() + ', bars colored by outcome', hbars(groupRows(cur, function (r) { return r.event_type || 'other'; }, function (k) { return ctx.typeLabel(k); }), { legend: OUTCOMES })));
    g.appendChild(card('How far ahead they ask', 'Days from the form to the event date', hbars(leadBuckets(cur), { legend: OUTCOMES })));
    g.appendChild(card('When they write', 'Submissions by day and hour, all time (Pacific)', heatmap(all.map(function (r) { return { dow: r.pt.dow, hour: r.pt.hour, n: 1 }; }), { unit: 'inquiries' })));
    g.appendChild(card('Which page', 'Last ' + windowName() + '. Older imports don’t record a page.', hbars(groupRows(cur, function (r) { return r.landing || 'Not recorded'; }))));
    g.appendChild(card('Site language', 'Last ' + windowName(), hbars(groupRows(cur, function (r) { return r.lang ? LANGS[r.lang] : 'Not recorded'; }))));
    g.appendChild(card('Top cities', 'Last ' + windowName(), hbars(groupRows(cur.filter(function (r) { return r.city; }), function (r) { return r.city.trim(); }, null, 10), { empty: 'No cities given.' })));
    body.appendChild(inquiryList(all));
  }

  function funnel(list) {
    var n = list.length;
    var posted = list.filter(function (r) { return r.published_at || ['open', 'confirmed', 'done', 'merged'].indexOf(r.status) >= 0; }).length;
    var confirmed = list.filter(function (r) { return r.confirmed_at || ['confirmed', 'done'].indexOf(r.status) >= 0; }).length;
    var done = list.filter(function (r) { return r.status === 'done'; }).length;
    var steps = [['Submitted', n], ['Posted to the team', posted], ['Confirmed', confirmed], ['Performed', done]];
    return h('div', null, hbars(steps.map(function (s, i) { return { label: s[0], value: s[1], sub: i ? pct(s[1], n) + ' of submitted' : null, color: '#c9a84c' }; })),
      h('p', { class: 'ins-note', text: outcomeParts(list).map(function (p) { return p.label + ' ' + p.value; }).join(' · ') }));
  }

  function inquiryList(all) {
    var wrap = h('section', { class: 'ins-card is-wide ins-list' });
    var types = Object.keys(countBy(all, function (r) { return r.event_type || 'other'; })).sort();
    var search = h('input', { type: 'search', class: 'ins-search', placeholder: 'Search name, email, city, message…', value: S.q, 'aria-label': 'Search inquiries' });
    var typeSel = h('select', { class: 'ins-select', 'aria-label': 'Event type' }, h('option', { value: 'all', text: 'All types' }),
      types.map(function (k) { return h('option', { value: k, text: ctx.typeLabel(k), selected: S.type === k ? true : null }); }));
    var chips = h('div', { class: 'ins-chips' });
    [['all', 'All']].concat(OUTCOMES.map(function (o) { return [o.key, o.label]; })).forEach(function (c) {
      chips.appendChild(h('button', { type: 'button', class: 'fchip' + (S.status === c[0] ? ' is-on' : ''), text: c[1], 'aria-pressed': S.status === c[0] ? 'true' : 'false',
        onclick: function () { S.status = c[0]; paintList(); chips.querySelectorAll('.fchip').forEach(function (b) { b.classList.toggle('is-on', b.textContent === c[1]); }); } }));
    });
    var monthChip = h('span');
    var list = h('div', { class: 'ins-rows' });
    var count = h('span', { class: 'ins-count' });
    var csv = h('button', { type: 'button', class: 'btn btn-sm', onclick: function () { downloadCsv(filtered()); } }, ctx.icon('download', 2), ' CSV');
    function filtered() {
      var q = S.q.toLowerCase();
      return all.filter(function (r) {
        if (S.status !== 'all' && r.outcome !== S.status) return false;
        if (S.type !== 'all' && (r.event_type || 'other') !== S.type) return false;
        if (S.month && monthKey(r.pt.y, r.pt.m) !== S.month) return false;
        if (q && [r.client_name, r.client_email, r.client_phone, r.city, r.message, r.date_text].join(' ').toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
    }
    function paintList() {
      var rows = filtered();
      count.textContent = rows.length + ' of ' + all.length;
      monthChip.innerHTML = '';
      if (S.month) monthChip.appendChild(h('button', { type: 'button', class: 'fchip is-on', text: monthLabel(S.month, true) + ' ✕', onclick: function () { S.month = null; paintList(); } }));
      list.innerHTML = '';
      if (!rows.length) list.appendChild(emptyNote('No inquiries match.'));
      rows.slice(0, 300).forEach(function (r) { list.appendChild(inquiryRow(r)); });
    }
    search.addEventListener('input', function () { S.q = search.value; paintList(); });
    typeSel.addEventListener('change', function () { S.type = typeSel.value; paintList(); });
    wrap.appendChild(h('header', { class: 'ins-card-head' }, h('h3', { class: 'ins-card-title', text: 'Every submission' }), count, csv));
    wrap.appendChild(h('div', { class: 'ins-filters' }, search, typeSel));
    wrap.appendChild(h('div', { class: 'ins-filters' }, chips, monthChip));
    wrap.appendChild(list);
    paintList();
    return wrap;
  }

  function inquiryRow(r) {
    var o = OUTCOMES.find(function (x) { return x.key === r.outcome; });
    var isOpen = S.open === r.id;
    var row = h('div', { class: 'ins-row' + (isOpen ? ' is-open' : '') });
    var top = h('button', { type: 'button', class: 'ins-row-top', 'aria-expanded': isOpen ? 'true' : 'false', onclick: function () { S.open = isOpen ? null : r.id; row.replaceWith(inquiryRow(r)); } },
      h('span', { class: 'ins-row-when' }, h('b', { text: fmtShortDay(r.pt.iso) }), h('small', { text: String(r.pt.y) })),
      h('span', { class: 'ins-row-main' },
        h('b', { text: (r.client_name || r.client_email || 'No name') + (r.repeat ? ' ↺' : '') }),
        h('small', { text: [ctx.typeLabel(r.event_type || 'other'), r.event_date ? 'for ' + fmtDay(r.event_date) : r.date_text, r.city].filter(Boolean).join(' · ') })),
      h('span', { class: 'ins-status' }, h('i', { style: 'background:' + o.color }), statusName(r.status)));
    row.appendChild(top);
    if (isOpen) {
      var facts = h('dl', { class: 'ins-facts' });
      [['Received', new Date(r.created_at).toLocaleString('en-US', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' })],
        ['Email', r.client_email ? h('a', { href: 'mailto:' + r.client_email, text: r.client_email }) : null],
        ['Phone', r.client_phone ? h('a', { href: 'tel:' + r.client_phone.replace(/[^\d+]/g, ''), text: r.client_phone }) : null],
        ['Event date', r.event_date ? fmtDay(r.event_date) + (r.leadDays != null ? ' (' + r.leadDays + ' days ahead)' : '') : r.date_text],
        ['City', r.city],
        ['Page', r.page ? (r.landing + (r.lang && r.lang !== 'en' ? ' · ' + LANGS[r.lang] : '')) : null],
        ['Came in via', r.source === 'formspree' ? 'Formspree (imported)' : 'Website form'],
        ['Repeat', r.repeat ? 'Inquiry #' + (r.repeat + 1) + ' from this person' : null],
      ].forEach(function (f) { if (f[1]) { facts.appendChild(h('dt', { text: f[0] })); facts.appendChild(h('dd', null, f[1])); } });
      row.appendChild(h('div', { class: 'ins-row-body' }, facts,
        r.message ? h('p', { class: 'card-text', text: '“' + r.message + '”' }) : null,
        h('div', { class: 'card-actions' },
          ctx.hasEvent(r.id) ? h('button', { type: 'button', class: 'btn btn-sm btn-gold', text: r.status === 'inquiry' ? 'Open in Inbox' : 'Open gig', onclick: function () { ctx.openEvent(r.id); } }) : null,
          r.client_email ? h('button', { type: 'button', class: 'btn btn-sm', text: 'Copy email', onclick: function () { ctx.copyText(r.client_email); } }) : null)));
    }
    return row;
  }
  function statusName(st) {
    return { inquiry: 'Pending', open: 'Posted', confirmed: 'Confirmed', done: 'Performed', merged: 'Merged', declined: 'Declined', cancelled: 'Cancelled', lapsed: 'Date passed', deleted: 'Hidden' }[st] || st;
  }
  function downloadCsv(rows) {
    var head = ['received_pt', 'status', 'type', 'event_date', 'date_text', 'city', 'name', 'email', 'phone', 'page', 'message'];
    // Names and messages come from the public form; a leading = + - @ would run as a spreadsheet formula.
    var esc = function (v) { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [r.pt.iso + ' ' + ('0' + r.pt.hour).slice(-2) + ':00', statusName(r.status), r.event_type, r.event_date, r.date_text, r.city, r.client_name, r.client_email, r.client_phone,
        r.page, r.message].map(esc).join(',');
    }));
    var a = h('a', { href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })), download: 'bfmh-inquiries-' + pt(new Date()).iso + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  function viewGallery(body, d) {
    var u = d.usage, gl = d.gallery;
    var tot = {}; gl.totals.forEach(function (t) { tot[t.kind] = t; });
    var memberViews = sum(u.actions.filter(function (a) { return a.role === 'member' && (a.action === 'view' || a.action === 'play'); }), function (a) { return a.n; });
    var downloads = sum(u.actions.filter(function (a) { return a.action === 'download'; }), function (a) { return a.n; });
    body.appendChild(kpis([
      { label: 'Photos', value: (tot.photo || {}).n || 0, sub: ((tot.photo || {}).website || 0) + ' on the website' },
      { label: 'Videos', value: ((tot.video || {}).n || 0) + ((tot.link || {}).n || 0), sub: ((tot.link || {}).n || 0) + ' on YouTube' },
      { label: 'Songs', value: (tot.audio || {}).n || 0, sub: 'in the music library' },
      { label: 'Views & plays', value: memberViews, sub: 'by families, last ' + windowName() },
      { label: 'Downloads', value: downloads, sub: 'last ' + windowName() },
      { label: 'Storage', value: fmtBytes(gl.used), sub: 'of ' + fmtBytes(gl.quota) + ' free tier', alert: gl.used / gl.quota > 0.85 },
    ]));
    var g = grid(); body.appendChild(g);
    g.appendChild(card('Most viewed', 'Last ' + windowName() + ', by how many devices opened it' + trackingSince(u), topMedia(u.top_media, u), { wide: true }));
    g.appendChild(card(S.days > 90 ? 'App opens per week' : 'App opens per day', trackingSince(u).replace(/^\. /, '') || null, dailyChart(u), { wide: true }));
    g.appendChild(card('Which tabs people use', 'Taps on each tab, last ' + windowName(), hbars(tabRows(u), {
      legend: [{ label: 'Families', color: '#3987e5' }, { label: 'Ramirez family', color: '#d95926' }], empty: emptyUsage(u) })));
    g.appendChild(card('Folders opened', 'Last ' + windowName(), hbars(u.galleries.map(galleryRow), { empty: emptyUsage(u) })));
    g.appendChild(card('Dances watched', 'Dance pages opened, last ' + windowName(), hbars(u.dances.map(function (x) { return { label: x.dance, value: x.viewers, sub: x.n + ' opens' }; }), { empty: emptyUsage(u), fmt: function (v) { return v + ' ' + (v === 1 ? 'device' : 'devices'); } })));
    g.appendChild(card('When people open the app', 'Last ' + windowName() + ' (Pacific)', heatmap(u.heat, { unit: 'opens', empty: emptyUsage(u) })));
    g.appendChild(card('How they open it', 'Last ' + windowName(), howTheyOpen(u)));
    g.appendChild(card('Calendar adds', 'Last ' + windowName(), hbars(u.calendar.map(function (c) {
      var p = c.what.split(':'); return { label: (p[0] === 'feed' ? 'Subscribed · ' : 'One gig · ') + ({ apple: 'Apple', google: 'Google', outlook: 'Outlook' }[p[1]] || p[1] || 'Other'), value: c.n };
    }).sort(function (a, b) { return b.value - a.value; }), { empty: emptyUsage(u) })));
    var months = recentMonths(gl.by_month, 18);
    g.appendChild(card('Uploads by month', 'Last 18 months. GroupMe imports keep their original dates.', columns(months.cats, KINDS.map(function (k) {
      return { key: k.key, label: k.label, color: k.color, values: months.cats.map(function (c) { return months.at[c + k.key] || 0; }) };
    }), { label: monthShort(months.cats), unit: 'items' }), { wide: true }));
    g.appendChild(card('Top contributors', 'Everything ever added, by family', hbars(gl.by_family.slice(0, 12).map(function (f) {
      return { label: f.who === 'Anna Mendez Perdomo' || /\(/.test(f.who) ? f.who : 'The ' + f.who + ' family', value: f.photos + f.videos + f.links + f.songs,
        parts: [{ label: 'Photos', value: f.photos, color: '#3987e5' }, { label: 'Videos', value: f.videos, color: '#d95926' }, { label: 'YouTube', value: f.links, color: '#199e70' }],
        sub: [f.photos && f.photos + ' photos', f.videos && f.videos + ' videos', f.links && f.links + ' YouTube', f.songs && f.songs + ' songs'].filter(Boolean).join(' · ') + (f.recent ? ' · ' + f.recent + ' this month' : '') };
    }), { legend: KINDS })));
    g.appendChild(card('Storage', null, h('div', null,
      meter(gl.used, gl.quota, fmtBytes(gl.used) + ' of ' + fmtBytes(gl.quota) + ' · ' + pct(gl.used, gl.quota)),
      hbars(gl.totals.filter(function (t) { return t.bytes; }).map(function (t) { return { label: { photo: 'Photos', video: 'Videos', audio: 'Songs' }[t.kind] || t.kind, value: t.bytes }; })
        .sort(function (a, b) { return b.value - a.value; }), { fmt: fmtBytes }))));
  }

  function topMedia(list, u) {
    if (!list.length) return emptyNote(emptyUsage(u));
    var el = h('div', { class: 'ins-media' });
    list.forEach(function (it, i) {
      el.appendChild(h('button', { type: 'button', class: 'ins-tile', onclick: function () { ctx.lightbox(list, i); } },
        it.thumb ? h('img', { src: it.thumb, alt: '', loading: 'lazy', onerror: function () { this.replaceWith(tilePh(it)); } }) : tilePh(it),
        h('span', { class: 'ins-tile-cap' },
          h('b', { text: it.viewers + ' ' + (it.viewers === 1 ? 'device' : 'devices') }),
          h('small', { text: [it.views && it.views + ' views', it.plays && it.plays + ' plays', it.downloads && it.downloads + ' saves'].filter(Boolean).join(' · ') }),
          h('small', { class: 'ins-tile-ev', text: it.title || it.event_title || '' }))));
    });
    return el;
  }
  function tilePh(it) { return h('span', { class: 'ins-tile-ph' }, ctx.icon(it.kind === 'audio' ? 'music' : it.kind === 'photo' ? 'image' : 'play', 2)); }
  function tabRows(u) {
    var m = {};
    u.tabs.forEach(function (t) { var k = t.tab || '?'; m[k] = m[k] || { member: 0, owner: 0 }; m[k][t.role] = (m[k][t.role] || 0) + t.n; });
    return Object.keys(m).map(function (k) {
      return { label: TAB_NAMES[k] || k, value: m[k].member + m[k].owner,
        parts: [{ label: 'Families', value: m[k].member, color: '#3987e5' }, { label: 'Ramirez family', value: m[k].owner, color: '#d95926' }],
        sub: m[k].member + ' by families · ' + m[k].owner + ' by the Ramirez family' };
    }).sort(function (a, b) { return b.value - a.value; });
  }
  function howTheyOpen(u) {
    if (!u.entry.length) return emptyNote(emptyUsage(u));
    var by = function (f, names) {
      var m = {}; u.entry.forEach(function (e) { var k = f(e) || '?'; m[k] = (m[k] || 0) + e.n; });
      return Object.keys(m).map(function (k) { return { label: names[k] || k, value: m[k] }; }).sort(function (a, b) { return b.value - a.value; });
    };
    var total = sum(u.entry, function (e) { return e.n; });
    var fmt = function (v) { return pct(v, total); };
    return h('div', { class: 'ins-split' },
      h('div', null, h('h4', { text: 'Installed or browser' }), hbars(by(function (e) { return e.mode; }, { app: 'Home-screen app', web: 'Browser' }), { fmt: fmt })),
      h('div', null, h('h4', { text: 'Way in' }), hbars(by(function (e) { return e.via; }, { familia: 'bfmh.dance/familia', team: 'Own link / team login', gig: 'Gig link from GroupMe' }), { fmt: fmt })),
      h('div', null, h('h4', { text: 'Language' }), hbars(by(function (e) { return e.lang; }, { en: 'English', es: 'Spanish' }), { fmt: fmt })));
  }
  function galleryRow(x) {
    return { label: (x.title || 'Folder') + (x.event_date ? ' · ' + fmtShortDay(x.event_date) + ', ' + x.event_date.slice(0, 4) : ''), value: x.viewers, sub: x.opens + ' opens',
      onclick: function () { ctx.openGallery(x.id); } };
  }
  function recentMonths(rows, n) {
    var now = pt(new Date()), end = monthKey(now.y, now.m);
    var y = now.y, m = now.m - (n - 1); while (m < 1) { m += 12; y--; }
    var cats = monthsBetween(monthKey(y, m), end), at = {};
    rows.forEach(function (r) { at[r.month + r.kind] = (at[r.month + r.kind] || 0) + r.n; });
    return { cats: cats, at: at };
  }

  function viewFamilies(body, d) {
    var u = d.usage, use = {}; u.families.forEach(function (f) { use[f.family_id] = f; });
    var fams = d.families.map(function (f) { var x = use[f.id] || {}; return Object.assign({}, f, { opens: x.opens || 0, views: x.views || 0, devices: x.devices || 0,
      rate: f.gigs_posted ? f.gigs_answered / f.gigs_posted : null }); });
    var answered = fams.filter(function (f) { return f.rate != null; });
    body.appendChild(kpis([
      { label: 'Families', value: fams.length, sub: d.roster + ' active dancers' },
      { label: 'Answer rate', value: answered.length ? Math.round(median(answered.map(function (f) { return f.rate; })) * 100) + '%' : null, sub: 'median family, gigs posted in 12 months' },
      { label: 'Time to answer', value: fmtHours(median(fams.map(function (f) { return f.median_hours; }))), sub: 'median family, after a gig is posted' },
      { label: 'Opened the app', value: fams.filter(function (f) { return f.opens; }).length, sub: 'families, last ' + windowName() },
      { label: 'Ramirez family phones', value: (u.owners && u.owners.devices) || 0, sub: 'used the team login, last ' + windowName() },
    ]));
    var g = grid(); body.appendChild(g);
    g.appendChild(card('Every family', 'Answer rate covers gigs posted to the team in the last 12 months. Tap a column to sort.', familyTable(fams), { wide: true }));
    var cats = Array.from(new Set(d.answer_channels.map(function (c) { return c.month; }))).sort();
    g.appendChild(card('How answers come in', 'Yes / maybe / no changes by channel. History is kept since Nov 2, 2026.', columns(cats, CHANNELS.map(function (ch) {
      return { key: ch.key, label: ch.label, color: ch.color, values: cats.map(function (m) { return sum(d.answer_channels.filter(function (c) { return c.month === m && c.channel === ch.key; }), function (c) { return c.n; }); }) };
    }), { label: monthShort(cats), unit: 'answers', empty: 'No answer history yet.' })));
    var bot = d.chona;
    g.appendChild(card('La Chona in GroupMe', 'Messages she read each month, and how many she turned into answers.', columns(bot.map(function (b) { return b.month; }), [
      { key: 'applied', label: 'Turned into answers', color: '#199e70', values: bot.map(function (b) { return b.applied - b.undone; }) },
      { key: 'undone', label: 'Undone', color: '#d95926', values: bot.map(function (b) { return b.undone; }) },
      { key: 'other', label: 'Just chat', color: 'rgba(255,255,255,0.3)', values: bot.map(function (b) { return b.messages - b.applied; }) },
    ], { label: monthShort(bot.map(function (b) { return b.month; })), unit: 'messages', empty: 'La Chona hasn’t read anything yet.' })));
  }

  function familyTable(fams) {
    var COLS = [
      ['name', 'Family', function (f) { return f.name; }, function (a, b) { return a.name.localeCompare(b.name); }],
      ['rate', 'Answers', function (f) { return f.rate == null ? '—' : pct(f.gigs_answered, f.gigs_posted) + ' (' + f.gigs_answered + '/' + f.gigs_posted + ')'; }, function (a, b) { return (a.rate == null ? 2 : a.rate) - (b.rate == null ? 2 : b.rate); }],
      ['speed', 'Answers in', function (f) { return fmtHours(f.median_hours); }, function (a, b) { return (a.median_hours == null ? 1e9 : a.median_hours) - (b.median_hours == null ? 1e9 : b.median_hours); }],
      ['uploads', 'Uploads', function (f) { return String(f.uploads); }, function (a, b) { return b.uploads - a.uploads; }],
      ['opens', 'Opens', function (f) { return String(f.opens); }, function (a, b) { return b.opens - a.opens; }],
      ['views', 'Views', function (f) { return String(f.views); }, function (a, b) { return b.views - a.views; }],
      ['seen', 'Last seen', function (f) { return ago(f.last_seen); }, function (a, b) { return (a.last_seen ? new Date(a.last_seen) : 0) - (b.last_seen ? new Date(b.last_seen) : 0); }],
    ];
    var col = COLS.find(function (c) { return c[0] === S.famSort; }) || COLS[0];
    var rows = fams.slice().sort(col[3]);
    var table = h('table', { class: 'ins-table ins-fam' },
      h('thead', null, h('tr', null, COLS.map(function (c) {
        return h('th', { 'aria-sort': c === col ? 'ascending' : null }, h('button', { type: 'button', class: c === col ? 'is-on' : '', text: c[1], onclick: function () { S.famSort = c[0]; savePrefs(); paint(); } }));
      }))),
      h('tbody', null, rows.map(function (f) {
        var low = f.rate != null && f.rate < 0.5;
        return h('tr', { class: low ? 'is-low' : '' }, COLS.map(function (c, i) {
          return h('td', { text: c[2](f), 'data-label': c[1] }, i === 0 ? h('small', { text: f.dancers + (f.dancers === 1 ? ' dancer' : ' dancers') }) : null);
        }));
      })));
    return h('div', { class: 'ins-table-wrap' }, table);
  }

  function viewGigs(body, d) {
    var today = pt(new Date()).iso, year = today.slice(0, 4);
    var gigs = d.gigs.filter(function (x) { return x.event_type !== 'team'; });
    var performed = gigs.filter(function (x) { return x.status === 'done' || (x.status === 'confirmed' && x.event_date && x.event_date < today); });
    var upcoming = gigs.filter(function (x) { return ['open', 'confirmed'].indexOf(x.status) >= 0 && x.event_date && x.event_date >= today; });
    var filled = performed.filter(function (x) { return x.dancers_needed && x.answers; });
    body.appendChild(kpis([
      { label: 'Performed', value: performed.length, sub: 'all time on record' },
      { label: 'This year', value: performed.filter(function (x) { return x.event_date && x.event_date.slice(0, 4) === year; }).length, sub: year },
      { label: 'Coming up', value: upcoming.length, sub: upcoming.filter(function (x) { return x.status === 'confirmed'; }).length + ' confirmed' },
      { label: 'Cancelled', value: gigs.filter(function (x) { return x.status === 'cancelled'; }).length, sub: 'after being posted' },
      { label: 'Filled', value: filled.length ? Math.round(median(filled.map(function (x) { return Math.min(1, x.yes / x.dancers_needed); })) * 100) + '%' : null, sub: 'median yes ÷ dancers needed' },
    ]));
    var g = grid(); body.appendChild(g);
    var years = Array.from(new Set(performed.filter(function (x) { return x.event_date; }).map(function (x) { return x.event_date.slice(0, 4); }))).sort();
    if (years.length) years = (function (a, b) { var out = []; for (var y = +a; y <= +b; y++) out.push(String(y)); return out; })(years[0], years[years.length - 1]);
    g.appendChild(card('Performances by year', 'Includes the gigs rebuilt from GroupMe history.', columns(years, [{ key: 'n', label: 'Performances', color: '#c9a84c',
      values: years.map(function (y) { return performed.filter(function (x) { return x.event_date && x.event_date.slice(0, 4) === y; }).length; }) }], { unit: 'gigs' })));
    g.appendChild(card('Busy months', 'All years combined, by month of the gig', columns(MONTHS, [{ key: 'n', label: 'Gigs', color: '#c9a84c',
      values: MONTHS.map(function (_, i) { return performed.concat(upcoming).filter(function (x) { return x.event_date && +x.event_date.slice(5, 7) === i + 1; }).length; }) }], { unit: 'gigs' })));
    g.appendChild(card('Kinds of gigs', 'Performed and upcoming', hbars(sortedCounts(performed.concat(upcoming), function (x) { return x.event_type ? ctx.typeLabel(x.event_type) : 'Not set'; }))));
    g.appendChild(card('Where we dance', 'Top cities', hbars(sortedCounts(performed.concat(upcoming).filter(function (x) { return x.city; }), function (x) { return x.city.trim(); }).slice(0, 10), { empty: 'No cities recorded.' })));
    g.appendChild(card('Recent headcounts', 'Yes answers vs dancers needed', hbars(performed.concat(upcoming).filter(function (x) { return x.answers; })
      .sort(function (a, b) { return String(b.event_date).localeCompare(String(a.event_date)); }).slice(0, 10).map(function (x) {
        return { label: fmtShortDay(x.event_date) + ' · ' + (x.title || 'Gig'), value: x.yes, color: x.dancers_needed && x.yes >= x.dancers_needed ? '#199e70' : x.dancers_needed ? '#c98500' : null,
          sub: (x.dancers_needed ? 'needed ' + x.dancers_needed + ' · ' : '') + x.answers + ' answered · ' + x.media + ' photos/videos',
          onclick: ctx.hasEvent(x.id) ? function () { ctx.openEvent(x.id); } : null };
      }), { empty: 'No answers recorded yet.' })), { wide: true });
  }
  function sortedCounts(list, f) {
    var c = countBy(list, f);
    return Object.keys(c).map(function (k) { return { label: k, value: c[k] }; }).sort(function (a, b) { return b.value - a.value; });
  }

  function windowName() { return (WINDOWS.find(function (w) { return w[0] === S.days; }) || [0, '30 days'])[1]; }
  function monthShort(cats) {
    var multiYear = cats.length && cats[0].slice(0, 4) !== cats[cats.length - 1].slice(0, 4);
    return function (c, full) { return /^\d{4}-\d\d$/.test(c) ? monthLabel(c, full || (multiYear && (c.slice(5) === '01' || c === cats[0]))) : c; };
  }
  function linkTo(view, label) {
    return h('button', { type: 'button', class: 'ins-link', onclick: function () { S.view = view; savePrefs(); paint(); var m = root.closest('.tm-main'); if (m) m.scrollTop = 0; } }, label, ctx.icon('chevron', 2.4));
  }
  function trackingSince(u) { return u.since ? '. Tracking since ' + fmtShortDay(new Date(u.since).toISOString()) + '.' : '. Tracking starts once families open the app.'; }
  function emptyUsage(u) { return u.total ? 'Nothing in this period yet.' : 'Nothing tracked yet — this fills in as families use the app.'; }
  function dailyChart(u) {
    if (S.days > 90) return weeklyChart(u);
    var now = Date.now(), days = [];
    for (var i = S.days - 1; i >= 0; i--) days.push(pt(new Date(now - i * DAY)).iso);
    var by = {}; u.daily.forEach(function (x) { by[x.day] = x; });
    return columns(days, [{ key: 'opens', label: 'Opens', color: '#c9a84c', values: days.map(function (dd) { return (by[dd] || {}).opens || 0; }) }], {
      label: function (c) { return fmtShortDay(c); }, height: 160, empty: emptyUsage(u),
      tipTotal: function (v, i) { var x = by[days[i]] || {}; return v + ' opens · ' + (x.devices || 0) + ' devices · ' + (x.families || 0) + ' families · ' + (x.views || 0) + ' views'; } });
  }

  function weeklyChart(u) {
    var now = Date.now(), weeks = [], by = {};
    for (var i = Math.floor(S.days / 7); i >= 0; i--) {
      var p = pt(new Date(now - i * 7 * DAY));
      weeks.push(pt(new Date(dateOnly(p.iso) - p.dow * DAY + 12 * 3600000)).iso);
    }
    u.daily.forEach(function (x) {
      var p = pt(new Date(dateOnly(x.day) + 12 * 3600000)), wk = pt(new Date(dateOnly(x.day) - p.dow * DAY + 12 * 3600000)).iso;
      var b = by[wk] = by[wk] || { opens: 0, views: 0 }; b.opens += x.opens; b.views += x.views;
    });
    return columns(weeks, [{ key: 'opens', label: 'Opens', color: '#c9a84c', values: weeks.map(function (w) { return (by[w] || {}).opens || 0; }) }], {
      label: function (c, full) { return (full ? 'Week of ' : '') + fmtShortDay(c); }, height: 160, empty: emptyUsage(u),
      tipTotal: function (v, i) { return v + ' opens · ' + ((by[weeks[i]] || {}).views || 0) + ' views'; } });
  }

  window.BFMHInsights = { render: render };
})();
