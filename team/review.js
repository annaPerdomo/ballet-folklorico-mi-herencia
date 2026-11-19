(function () {
  'use strict';

  var GIGSALAD = 'https://www.gigsalad.com/ballet_folklorico_mexican_folk_dance_w';
  var BRAND = 'Ballet Folklórico Mi Herencia';
  var MAX_BYTES = 8 * 1024 * 1024;

  var STR = {
    en: {
      greet: 'Hi {name}, thank you for having us!', greetNoName: 'Thank you for having us!',
      rating: 'Your rating', stars: '{n} stars', star1: '1 star',
      body: 'Your review', bodyPh: 'What did your guests enjoy most?',
      name: 'Name to show with your review',
      photos: 'Add photos (optional)', photosHint: 'Photos are only seen by Mayra and Angel.', removePhoto: 'Remove photo {n}',
      consent: 'Ballet Folklórico Mi Herencia may share my review on its website.',
      send: 'Send review', update: 'Update review', sending: 'Sending…', uploading: 'Uploading photo {n} of {total}',
      thanksTitle: 'Thank you, {name}!', thanksTitleNoName: 'Thank you!',
      thanksBody: 'Mayra and Angel will read your review before it is posted.',
      copy: 'Copy my review', copied: 'Copied', gigsalad: 'Post it on GigSalad too (optional)',
      photosFailed: 'Your review was sent, but these photos did not upload: {list}',
      received: 'We already have your review. Thank you!',
      invalid: 'This link is not valid. Please ask Mayra or Angel for a new one.',
      loading: 'Loading…', errNet: 'Something went wrong. Check your connection and try again.',
      tryAgain: 'Try again', holdCopy: 'Press and hold to copy', switchTo: 'Español',
      needStars: 'Please pick a star rating.', needBody: 'Please write at least a sentence or two.', needName: 'Please add the name to show with your review.', needConsent: 'Please tick the box so we can share your review.',
      types: { festival: 'Festival', quinceanera: 'Quinceañera', wedding: 'Wedding', private: 'Private event', corporate: 'Corporate event', school: 'School event', classes: 'Classes', team: 'Team event', other: 'Event' },
    },
    es: {
      greet: 'Hola {name}, ¡gracias por invitarnos!', greetNoName: '¡Gracias por invitarnos!',
      rating: 'Tu calificación', stars: '{n} estrellas', star1: '1 estrella',
      body: 'Tu reseña', bodyPh: '¿Qué fue lo que más disfrutaron tus invitados?',
      name: 'Nombre que se mostrará con tu reseña',
      photos: 'Agregar fotos (opcional)', photosHint: 'Solo Mayra y Angel ven las fotos.', removePhoto: 'Quitar foto {n}',
      consent: 'Ballet Folklórico Mi Herencia puede compartir mi reseña en su sitio web.',
      send: 'Enviar reseña', update: 'Actualizar reseña', sending: 'Enviando…', uploading: 'Subiendo foto {n} de {total}',
      thanksTitle: '¡Gracias, {name}!', thanksTitleNoName: '¡Gracias!',
      thanksBody: 'Mayra y Angel van a leer tu reseña antes de publicarla.',
      copy: 'Copiar mi reseña', copied: 'Copiada', gigsalad: 'Publícala también en GigSalad (opcional)',
      photosFailed: 'Tu reseña se envió, pero estas fotos no se subieron: {list}',
      received: 'Ya tenemos tu reseña. ¡Gracias!',
      invalid: 'Este enlace no es válido. Pídele a Mayra o a Angel uno nuevo.',
      loading: 'Cargando…', errNet: 'Algo salió mal. Revisa tu conexión e inténtalo otra vez.',
      tryAgain: 'Intentar de nuevo', holdCopy: 'Mantén presionado para copiar', switchTo: 'English',
      needStars: 'Elige una calificación de estrellas.', needBody: 'Escribe al menos una o dos frases.', needName: 'Agrega el nombre que aparecerá con tu reseña.', needConsent: 'Marca la casilla para que podamos compartir tu reseña.',
      types: { festival: 'Festival', quinceanera: 'Quinceañera', wedding: 'Boda', private: 'Evento privado', corporate: 'Evento empresarial', school: 'Evento escolar', classes: 'Clases', team: 'Evento del grupo', other: 'Evento' },
    },
  };

  var root = document.getElementById('review');
  var headerRight = document.getElementById('header-right');
  var lang = /^es/i.test(navigator.language || '') ? 'es' : 'en';
  var data = null;
  var phase = 'loading';
  var form = { rating: 0, body: '', name: '', consent: false, photos: [] };
  var sending = '';
  var errMsg = '';
  var errEl = null;
  var langBtn = null;
  var failed = [];
  var copyShown = false;
  var copiedTimer = 0;

  function t(key, vars) {
    var s = STR[lang][key];
    if (s == null) s = STR.en[key];
    if (s == null) return key;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : ''; });
  }

  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  function wordmark() {
    return h('span', { translate: 'no', class: 'notranslate', text: BRAND });
  }

  function starIcon() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M12 2.5l2.95 6.1 6.7.9-4.9 4.65 1.25 6.65L12 17.4l-6 3.4 1.25-6.65-4.9-4.65 6.7-.9z');
    svg.appendChild(p);
    return svg;
  }

  function dateLabel(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function summary() {
    var ev = data.event;
    var parts = [ev.title, STR[lang].types[ev.type] || '', dateLabel(ev.date)].filter(Boolean);
    return parts.join(' · ');
  }

  function gigsaladLink() {
    return h('a', { class: 'rv-btn ghost', href: GIGSALAD, target: '_blank', rel: 'noopener noreferrer', text: t('gigsalad') });
  }

  function showError(msg) {
    errMsg = msg;
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }

  function paintToggle() {
    headerRight.textContent = '';
    langBtn = h('button', { type: 'button', class: 'rv-lang', lang: lang === 'es' ? 'en' : 'es', text: t('switchTo'), disabled: Boolean(sending), onclick: function () {
      lang = lang === 'es' ? 'en' : 'es';
      document.documentElement.lang = lang;
      paint();
      langBtn.focus();
    } });
    headerRight.appendChild(langBtn);
  }

  function go(next) {
    phase = next;
    sending = '';
    paint();
    var head = root.querySelector('[data-head]');
    if (head) head.focus();
  }

  function paint() {
    paintToggle();
    var keep = root.scrollTop;
    root.textContent = '';
    errEl = null;
    var wrap = h('div', { class: 'rv' });
    root.appendChild(wrap);
    if (phase === 'loading') wrap.appendChild(h('p', { class: 'rv-note rv-center', text: t('loading') }));
    else if (phase === 'error') {
      errEl = h('p', { class: 'rv-err', role: 'alert', text: t('errNet') });
      wrap.appendChild(errEl);
      wrap.appendChild(h('button', { type: 'button', class: 'rv-btn', text: t('tryAgain'), onclick: load }));
    } else if (phase === 'invalid') wrap.appendChild(card(heading(t('invalid'))));
    else if (phase === 'received') wrap.appendChild(card(heading(t('received')), gigsaladLink()));
    else if (phase === 'thanks') wrap.appendChild(thanks());
    else wrap.appendChild(formView());
    root.scrollTop = keep;
  }

  function heading(text) {
    return h('h1', { class: 'rv-title', tabindex: '-1', 'data-head': '1', text: text });
  }

  function card() {
    var c = h('div', { class: 'rv-card rv-center' });
    for (var i = 0; i < arguments.length; i++) c.appendChild(arguments[i]);
    return c;
  }

  function starPicker() {
    var group = h('div', { class: 'rv-stars', role: 'radiogroup', 'aria-required': 'true', 'aria-label': t('rating') });
    var btns = [];
    function select(n) {
      form.rating = n;
      btns.forEach(function (b, i) {
        b.classList.toggle('on', i < n);
        b.setAttribute('aria-checked', i + 1 === n ? 'true' : 'false');
        b.tabIndex = i + 1 === n || (!n && i === 0) ? 0 : -1;
      });
    }
    for (var i = 1; i <= 5; i++) {
      (function (n) {
        var b = h('button', { type: 'button', class: 'rv-star', role: 'radio', 'aria-checked': 'false', 'aria-label': n === 1 ? t('star1') : t('stars', { n: n }),
          onclick: function () { select(n); },
          onkeydown: function (e) {
            var next = 0;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, (form.rating || 0) + 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, (form.rating || 2) - 1);
            else if (e.key === 'Home') next = 1;
            else if (e.key === 'End') next = 5;
            else return;
            e.preventDefault();
            select(next);
            btns[next - 1].focus();
          } }, starIcon());
        btns.push(b);
        group.appendChild(b);
      })(i);
    }
    select(form.rating);
    return group;
  }

  var sendBtn = null;
  function syncSend() {
    if (langBtn) langBtn.disabled = Boolean(sending);
    if (!sendBtn) return;
    sendBtn.disabled = Boolean(sending);
    sendBtn.textContent = sending || (data && data.review ? t('update') : t('send'));
  }

  function renderThumbs(box, onChange) {
    box.textContent = '';
    form.photos.forEach(function (p, i) {
      if (!p.url) p.url = URL.createObjectURL(p.file);
      box.appendChild(h('div', { class: 'rv-thumb' },
        h('img', { src: p.url, alt: '' }),
        h('button', { type: 'button', 'aria-label': t('removePhoto', { n: i + 1 }), onclick: function () {
          URL.revokeObjectURL(p.url);
          form.photos.splice(i, 1);
          renderThumbs(box, onChange);
        } }, h('span', { text: '×', 'aria-hidden': 'true' }))));
    });
    onChange();
  }

  function formView() {
    var ev = data.event;
    var left = data.photos_left;
    var count = h('p', { class: 'rv-count', hidden: true });
    function paintCount() {
      count.hidden = form.body.length <= 1200;
      count.textContent = form.body.length + ' / 1500';
      count.classList.toggle('warn', form.body.length > 1400);
    }
    paintCount();
    var text = h('textarea', { id: 'rv-body', class: 'rv-text', maxlength: '1500', placeholder: t('bodyPh'), value: form.body, oninput: function (e) {
      form.body = e.target.value;
      paintCount();
    } });
    var nameIn = h('input', { id: 'rv-name', class: 'rv-input', type: 'text', maxlength: '60', autocomplete: 'name', value: form.name, oninput: function (e) {
      form.name = e.target.value;
    } });
    var thumbs = h('div', { class: 'rv-thumbs' });
    var addBtn = h('button', { type: 'button', class: 'rv-btn ghost', text: t('photos'), onclick: function () { file.click(); } });
    var file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: function (e) {
      var room = left - form.photos.length;
      Array.prototype.slice.call(e.target.files).slice(0, Math.max(0, room)).forEach(function (f) { form.photos.push({ file: f }); });
      e.target.value = '';
      renderThumbs(thumbs, syncAdd);
    } });
    function syncAdd() { addBtn.hidden = form.photos.length >= left; }
    renderThumbs(thumbs, syncAdd);
    var gotcha = h('input', { class: 'rv-gotcha', type: 'text', name: '_gotcha', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    var check = h('input', { type: 'checkbox', checked: form.consent, onchange: function (e) { form.consent = e.target.checked; } });
    sendBtn = h('button', { type: 'submit', class: 'rv-btn', text: t('send') });
    errEl = h('p', { class: 'rv-err', role: 'alert', hidden: !errMsg, text: errMsg });
    syncSend();
    var greet = ev.first_name ? t('greet', { name: ev.first_name }) : t('greetNoName');
    var firstStar = function () { return root.querySelector('.rv-star'); };

    function firstMissing() {
      if (!form.rating) return [t('needStars'), firstStar];
      if (form.body.trim().length < 10) return [t('needBody'), function () { return text; }];
      if (!form.name.trim()) return [t('needName'), function () { return nameIn; }];
      if (!form.consent) return [t('needConsent'), function () { return check; }];
      return null;
    }

    return h('form', { class: 'rv-card', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      if (sending) return;
      var miss = firstMissing();
      if (miss) {
        showError(miss[0]);
        var el = miss[1]();
        if (el) el.focus();
        return;
      }
      submit();
    } },
      h('div', {},
        h('h1', { class: 'rv-title' }, wordmark()),
        h('p', { class: 'rv-sub', text: greet }),
        h('p', { class: 'rv-sub', text: summary() })),
      h('div', {}, h('span', { class: 'rv-label', text: t('rating') }), starPicker()),
      h('div', {}, h('label', { class: 'rv-label', for: 'rv-body', text: t('body') }), text, count),
      h('div', {}, h('label', { class: 'rv-label', for: 'rv-name', text: t('name') }), nameIn),
      left > 0 ? h('div', {}, addBtn, file, thumbs, h('p', { class: 'rv-hint', text: t('photosHint') })) : null,
      h('label', { class: 'rv-check' }, check, h('span', {}, t('consent').split(BRAND)[0], wordmark(), t('consent').split(BRAND)[1] || '')),
      gotcha, errEl, sendBtn);
  }

  function post(body) {
    return fetch('/api/gig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
      });
  }

  function toJpeg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    }).then(function (img) {
      var scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('encode')); }, 'image/jpeg', 0.85);
      });
    });
  }

  function uploadPhoto(file, base) {
    return toJpeg(file).then(function (blob) {
      if (blob.size > MAX_BYTES) throw new Error('big');
      return post(Object.assign({}, base, { action: 'photo', type: 'image/jpeg', size: blob.size })).then(function (r) {
        if (r.status !== 200 || !r.body.put) throw new Error('slot');
        return fetch(r.body.put, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob }).then(function (put) {
          if (!put.ok) throw new Error('put');
          return post(Object.assign({}, base, { action: 'photo_done', id: r.body.id }));
        }).then(function (done) {
          if (done.status !== 200) throw new Error('done');
        });
      });
    });
  }

  function submit() {
    var base = { review: Number(root.dataset.review), s: root.dataset.s };
    var gotcha = root.querySelector('input[name="_gotcha"]');
    showError('');
    sending = t('sending');
    syncSend();
    post(Object.assign({}, base, {
      action: 'submit', rating: form.rating, body: form.body.trim(), display_name: form.name.trim(), consent: true, lang: lang, _gotcha: gotcha ? gotcha.value : '',
    })).then(function (r) {
      if (r.status === 409) return go('received');
      if (r.status === 404) return go('invalid');
      if (r.status !== 200) {
        sending = '';
        syncSend();
        return showError(r.status >= 500 || !r.body.error ? t('errNet') : r.body.error);
      }
      var list = form.photos.slice();
      failed = [];
      var chain = Promise.resolve();
      list.forEach(function (p, i) {
        chain = chain.then(function () {
          sending = t('uploading', { n: i + 1, total: list.length });
          syncSend();
          return uploadPhoto(p.file, base).catch(function () { failed.push(i + 1); });
        });
      });
      return chain.then(function () { go('thanks'); });
    }).catch(function () {
      sending = '';
      syncSend();
      showError(t('errNet'));
    });
  }

  function execCopy(text) {
    var ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1', readonly: true, style: 'position:fixed;left:-9999px;top:0;font-size:16px' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    var okCopy = false;
    try { okCopy = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve(okCopy);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return execCopy(text); });
    }
    return execCopy(text);
  }

  function thanks() {
    var name = data.event.first_name;
    var body = form.body.trim();
    var copy = h('button', { type: 'button', class: 'rv-btn', text: t('copy'), onclick: function () {
      copyText(body).then(function (done) {
        if (!done) {
          copyShown = true;
          paint();
          var box = root.querySelector('.rv-fallback');
          if (box) { box.focus(); box.select(); box.setSelectionRange(0, body.length); }
          return;
        }
        copy.textContent = t('copied');
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(function () { copy.textContent = t('copy'); }, 2000);
      });
    } });
    var fallback = copyShown ? h('div', {},
      h('textarea', { class: 'rv-text rv-fallback', readonly: true, 'aria-label': t('copy'), value: body }),
      h('p', { class: 'rv-hint', text: t('holdCopy') })) : null;
    return card(
      heading(name ? t('thanksTitle', { name: name }) : t('thanksTitleNoName')),
      h('p', { class: 'rv-note', text: t('thanksBody') }),
      failed.length ? h('p', { class: 'rv-err', role: 'alert', text: t('photosFailed', { list: failed.join(', ') }) }) : null,
      copy, fallback, gigsaladLink());
  }

  function load() {
    phase = 'loading';
    paint();
    fetch('/api/gig?review=' + encodeURIComponent(root.dataset.review) + '&s=' + encodeURIComponent(root.dataset.s) + '&json=1')
      .then(function (r) {
        if (r.status === 404) { phase = 'invalid'; return null; }
        if (!r.ok) throw new Error('bad');
        return r.json();
      })
      .then(function (j) {
        if (j) {
          data = j;
          if (j.received) phase = 'received';
          else {
            phase = 'form';
            form.name = form.name || j.suggested_name || '';
            if (j.review && !form.body) {
              form.rating = j.review.rating;
              form.body = j.review.body;
              form.name = j.review.display_name;
              form.consent = true;
            }
          }
        }
        paint();
      })
      .catch(function () {
        phase = 'error';
        paint();
      });
  }

  document.documentElement.lang = lang;
  if (root.hasAttribute('data-invalid') || !root.dataset.review || !root.dataset.s) go('invalid');
  else load();
})();
