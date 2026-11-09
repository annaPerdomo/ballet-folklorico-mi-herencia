/* Group event page, shared by the public invite (/e/<id>/<sig>) and the team app. */
(function () {
  'use strict';

  var STR = {
    en: {
      cats: { mains: 'Main dishes', sides: 'Sides', desserts: 'Desserts', drinks: 'Drinks', other: 'Other' },
      invited: 'You’re invited',
      addToCal: 'Add to calendar', directions: 'Directions', share: 'Share invite', shareMsg: 'You’re invited to {title}! RSVP here:',
      calPick: 'Which calendar do you use?', calApple: 'Apple Calendar / iPhone', calGoogle: 'Google Calendar', calOutlook: 'Outlook', cancel: 'Cancel', mapPick: 'Get directions with',
      rsvpTitle: 'Will you be there?', rsvpSub: 'Let the hosts know how many to expect.',
      yourName: 'Name for the guest list', needName: 'Add a name for the guest list first', namePh: 'e.g. Tía Lupe & family',
      notYou: 'Not the {name} family? Write yourself in', asFamily: 'Answer as the {name} family instead',
      going: 'Going', maybe: 'Maybe', cant: 'Can’t go', less: 'One fewer', more: 'One more',
      noteLabel: 'Note for the hosts', notePh: 'Allergies, arriving late… (optional)', send: 'Send RSVP', needStatus: 'Pick Going, Maybe or Can’t go first', update: 'Save changes',
      youGoing: 'You’re going!', youMaybe: 'You said maybe', youNo: 'You can’t make it', youNoSub: 'We’ll miss you. You can change your answer anytime.',
      change: 'Edit my RSVP', leave: 'Take me off the list', leaveAsk: 'Take your RSVP off the list? Anything you signed up to bring goes back on the list.',
      whoComing: 'Who’s coming', personOne: 'person', personMany: 'people', rsvpOne: '1 RSVP', rsvpMany: '{n} RSVPs',
      maybeN: '{n} maybe', cantN: '{n} can’t make it', beFirst: 'No RSVPs yet — be the first!', you: 'You', familyName: '{name} family',
      bringOther: 'Add a dish', addAnother: 'Add another dish', removeRow: 'Remove dish {n}', nothingYet: 'Nothing yet', bringPh: 'e.g. Flan, aguas frescas', category: 'Type of dish', chooseType: 'Choose type', needType: 'Choose what type of dish it is',
      bringing: 'You’re bringing', bringTitle: 'What are you bringing?', suggestions: 'Ideas from the hosts',
      past: 'This event already happened — thank you for coming!', photos: 'Photos & videos',
      thanks: '¡Gracias! You’re on the list', saved: 'Saved', removed: 'Removed',
      removeGuest: 'Remove from the guest list', removeAsk: 'Take {name} off the guest list? What they signed up to bring goes back on the list.', remove: 'Remove', removeDish: 'Take “{item}” off', hostNote: 'Note',
      invalid: 'This invite link isn’t valid anymore. Ask whoever sent it for a new one.', loading: 'Loading…', tryAgain: 'Try again',
      copied: 'Link copied', hosted: 'Hosted by', openInApp: 'Manage this event in the team app',
      rsvpFamily: 'Will the {name} family be there?', howMany: 'How many are coming?', howManyHint: 'Count yourself too.',
      adults: 'Adults', kids: 'Kids', adultsN: '{n} adults', adultN: '1 adult', kidsN: '{n} kids', kidN: '1 kid',
      addNote: 'Add a note for the hosts',
      flyer: 'Event flyer', addFlyer: 'Add a flyer', close: 'Close',
      announce: 'Post to GroupMe', remind: 'Remind in GroupMe', notAnnounced: 'Not posted to GroupMe yet',
    },
    es: {
      cats: { mains: 'Platillos', sides: 'Guarniciones', desserts: 'Postres', drinks: 'Bebidas', other: 'Otros' },
      invited: 'Estás invitado',
      addToCal: 'Agregar al calendario', directions: 'Cómo llegar', share: 'Compartir invitación', shareMsg: '¡Te invitamos a {title}! Confirma aquí:',
      calPick: '¿Qué calendario usas?', calApple: 'Apple Calendar / iPhone', calGoogle: 'Google Calendar', calOutlook: 'Outlook', cancel: 'Cancelar', mapPick: 'Cómo llegar con',
      rsvpTitle: '¿Vas a venir?', rsvpSub: 'Avísale a los anfitriones cuántos van.',
      yourName: 'Nombre para la lista', needName: 'Primero escribe un nombre para la lista', namePh: 'p. ej. Tía Lupe y familia',
      notYou: '¿No eres de la familia {name}? Escribe tu nombre', asFamily: 'Mejor responder como la familia {name}',
      going: 'Voy', maybe: 'Tal vez', cant: 'No puedo', less: 'Uno menos', more: 'Uno más',
      noteLabel: 'Nota para los anfitriones', notePh: 'Alergias, si llegas tarde… (opcional)', send: 'Enviar respuesta', needStatus: 'Primero elige Voy, Tal vez o No puedo', update: 'Guardar cambios',
      youGoing: '¡Vas!', youMaybe: 'Dijiste que tal vez', youNo: 'No puedes ir', youNoSub: 'Te vamos a extrañar. Puedes cambiar tu respuesta cuando quieras.',
      change: 'Editar mi respuesta', leave: 'Quitarme de la lista', leaveAsk: '¿Quitar tu respuesta de la lista? Lo que ibas a llevar vuelve a la lista.',
      whoComing: 'Quiénes vienen', personOne: 'persona', personMany: 'personas', rsvpOne: '1 respuesta', rsvpMany: '{n} respuestas',
      maybeN: '{n} tal vez', cantN: '{n} no pueden', beFirst: 'Aún no hay respuestas. ¡Sé el primero!', you: 'Tú', familyName: 'Familia {name}',
      bringOther: 'Agregar un platillo', addAnother: 'Agregar otro platillo', removeRow: 'Quitar platillo {n}', nothingYet: 'Nada todavía', bringPh: 'p. ej. flan, aguas frescas', category: 'Tipo de platillo', chooseType: 'Elige el tipo', needType: 'Elige qué tipo de platillo es',
      bringing: 'Vas a llevar', bringTitle: '¿Qué vas a llevar?', suggestions: 'Ideas de los anfitriones',
      past: 'Este convivio ya pasó. ¡Gracias por venir!', photos: 'Fotos y videos',
      thanks: '¡Gracias! Ya estás en la lista', saved: 'Guardado', removed: 'Quitado',
      removeGuest: 'Quitar de la lista', removeAsk: '¿Quitar a {name} de la lista? Lo que iba a llevar vuelve a la lista.', remove: 'Quitar', removeDish: 'Quitar “{item}”', hostNote: 'Nota',
      invalid: 'Este enlace de invitación ya no es válido. Pide uno nuevo a quien te lo mandó.', loading: 'Cargando…', tryAgain: 'Reintentar',
      copied: 'Enlace copiado', hosted: 'Organiza', openInApp: 'Administra este convivio en la app del equipo',
      rsvpFamily: '¿Va a venir la familia {name}?', howMany: '¿Cuántos van a venir?', howManyHint: 'Cuéntate a ti también.',
      adults: 'Adultos', kids: 'Niños', adultsN: '{n} adultos', adultN: '1 adulto', kidsN: '{n} niños', kidN: '1 niño',
      addNote: 'Agregar una nota para los anfitriones',
      flyer: 'Volante del convivio', addFlyer: 'Agregar un volante', close: 'Cerrar',
      announce: 'Publicar en GroupMe', remind: 'Recordar en GroupMe', notAnnounced: 'Aún no se ha publicado en GroupMe',
    },
  };
  var CATS = ['mains', 'sides', 'desserts', 'drinks', 'other'];
  var ICONS = {
    yes: '<path d="M20 6 9 17l-5-5"/>', no: '<path d="M18 6 6 18M6 6l12 12"/>',
    maybe: '<path d="M9.2 9.2a3 3 0 1 1 4.4 2.7c-1 .6-1.6 1.3-1.6 2.5"/><path d="M12 18.2v.01"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    pin: '<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    pot: '<path d="M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 10h20M9 6c0-1 1-1.5 1-2.5M14 6c0-1 1-1.5 1-2.5"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5.5"/>',
    note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };

  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === false || v == null) return;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function icon(name, width) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', width || 2); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = ICONS[name] || '';
    return el;
  }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {}
    return null;
  }

  /* Papel picado: flag designs live in team/picado.svg; each kind of event strings up its own. */
  var FIESTA = ['#e84393', '#1e9ce0', '#fdc53a', '#8c4be0', '#f0832e', '#1cc09e', '#e12b30', '#2bc463', '#4547dd'];
  var PICADO_THEMES = {
    classic: { flags: [1, 2, 3, 4, 5, 6], colors: FIESTA },
    potluck: { flags: [10, 3, 1, 14, 10, 5], colors: ['#f0832e', '#fdc53a', '#e12b30', '#2bc463', '#1cc09e', '#e84393'] },
    party: { flags: [11, 12, 7, 1, 11, 12], colors: FIESTA },
    practice: { flags: [4, 14, 3, 5, 4, 14], colors: FIESTA },
    meeting: { flags: [5, 1, 2, 3, 5, 1], colors: ['#1e9ce0', '#fdc53a', '#1cc09e', '#8c4be0', '#e84393', '#4547dd'] },
    outing: { flags: [13, 3, 2, 1, 13, 3], colors: ['#1e9ce0', '#fdc53a', '#2bc463', '#f0832e', '#1cc09e', '#e84393'] },
    muertos: { flags: [6, 1, 3, 6, 8, 5], colors: ['#f0832e', '#e84393', '#8c4be0', '#fdc53a', '#1cc09e', '#e12b30'] },
    // Copies the papel picado on the 2026 end-of-year potluck flyer.
    navidad: { flags: [8, 15, 16, 17, 18, 9], colors: ['#ec4f9c', '#3fb24f', '#f7c534', '#1fb3b5', '#e5352c', '#9a4fd8'], step: 1 },
  };
  function picadoTheme(ev) {
    var kind = ev && ev.event_type, month = ev && ev.event_date ? +ev.event_date.slice(5, 7) : 0;
    if ((month === 10 || month === 11) && (kind === 'party' || kind === 'potluck')) return PICADO_THEMES.muertos;
    if (month === 12 && (kind === 'potluck' || kind === 'party')) return PICADO_THEMES.navidad;
    return PICADO_THEMES[kind] || PICADO_THEMES.classic;
  }
  var picadoReady = null;
  function loadPicado() {
    if (!picadoReady) {
      picadoReady = fetch('/team/picado.svg').then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); }).then(function (svg) {
        // 0×0, not display:none: Safari stops resolving <use> into hidden defs.
        var holder = document.createElement('div');
        holder.setAttribute('aria-hidden', 'true');
        holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        holder.innerHTML = svg;
        document.body.appendChild(holder);
      }).catch(function () { picadoReady = null; });
    }
    return picadoReady;
  }
  function picadoString(cls, w, sag, n, theme) {
    var NS = 'http://www.w3.org/2000/svg', top = 14, x0 = -10, x1 = w + 10, cy = top + 2 * sag;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + (top + sag + 58));
    svg.setAttribute('class', 'pt-pp ' + cls);
    var d = 'M' + x0 + ',' + top + ' Q' + w / 2 + ',' + cy + ' ' + x1 + ',' + top;
    function thread(width, opacity) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('class', 'pt-string'); p.setAttribute('stroke-width', width); p.setAttribute('opacity', opacity);
      return p;
    }
    svg.appendChild(thread(1.6, 0.6));
    for (var i = 0; i < n; i++) {
      var tt = (i + 0.5) / n, u = 1 - tt;
      var x = u * u * x0 + 2 * u * tt * (w / 2) + tt * tt * x1, y = u * u * top + 2 * u * tt * cy + tt * tt * top;
      var tilt = Math.atan2(2 * u * (cy - top) + 2 * tt * (top - cy), 2 * u * (w / 2 - x0) + 2 * tt * (x1 - w / 2)) * 180 / Math.PI;
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'ppw');
      g.style.animationDuration = (3.8 + (i % 4) * 0.45).toFixed(2) + 's';
      g.style.animationDelay = (-(i * 0.7) % 4.2).toFixed(2) + 's';
      var use = document.createElementNS(NS, 'use');
      use.setAttribute('href', '#pic-flag-' + theme.flags[i % theme.flags.length]);
      use.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + tilt.toFixed(1) + ') translate(0,-2) scale(0.62)');
      use.setAttribute('fill', theme.colors[(i * (theme.step || 4)) % theme.colors.length]);
      g.appendChild(use);
      svg.appendChild(g);
    }
    svg.appendChild(thread(1, 0.25));
    return svg;
  }
  function picado(ev) {
    var theme = picadoTheme(ev);
    return h('div', { class: 'pt-picado', 'aria-hidden': 'true' }, picadoString('pt-pp-phone', 480, 30, 6, theme), picadoString('pt-pp-wide', 1000, 34, 12, theme));
  }

  function mount(root, opts) {
    var lang = opts.lang === 'es' ? 'es' : 'en';
    var id = +opts.id, sig = opts.sig || null;
    var KEY = 'bfmh_party_' + id;
    var GUEST = KEY + '_guest';
    var data = null, form = null, err = null, busy = false;

    function t(k, vars) {
      var s = STR[lang][k]; if (s === undefined) s = STR.en[k]; if (s === undefined) s = k;
      if (vars) Object.keys(vars).forEach(function (v) { s = s.replace('{' + v + '}', vars[v]); });
      return s;
    }
    function plural(n, one, many) { return t(n === 1 ? one : many, { n: n }); }
    function toast(msg, bad) {
      if (opts.toast) return opts.toast(msg, bad);
      var el = document.getElementById('toast'); if (!el) return;
      el.textContent = msg; el.className = 'tm-toast' + (bad ? ' err' : ''); el.hidden = false;
      clearTimeout(toast.timer); toast.timer = setTimeout(function () { el.hidden = true; }, bad ? 5000 : 2600);
    }
    // The app always answers as the signed-in family; only the invite page can write a guest in instead.
    function asGuest() { return !opts.embedded && store(GUEST) === '1'; }
    function api(body) {
      var headers = { 'Content-Type': 'application/json' };
      var key = store(KEY); if (key) headers['x-bfmh-guest'] = key;
      var init = body ? { method: 'POST', headers: headers, credentials: 'same-origin', body: JSON.stringify(Object.assign({ party: id, s: sig, guest: asGuest() }, body)) }
        : { headers: headers, credentials: 'same-origin' };
      var url = body ? '/api/gig' : '/api/gig?party=' + id + (sig ? '&s=' + encodeURIComponent(sig) : '') + (asGuest() ? '&guest=1' : '');
      return fetch(url, init).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) { var e = new Error(d.error || 'Something went wrong (' + r.status + ')'); e.status = r.status; throw e; }
          if (d.key) store(KEY, d.key);
          return d;
        });
      });
    }
    var BRINGING_ACTS = ['rsvp', 'claim', 'unclaim', 'drop', 'leave'];
    function act(body, okMsg) {
      if (busy) return Promise.resolve(false);
      busy = true;
      return api(body).then(function (d) {
        busy = false; data = d; if (d.sig) sig = d.sig;
        if (form && form.bring && BRINGING_ACTS.indexOf(body.action) !== -1) form.bring = Object.assign(bringFrom(mine()), { rows: form.bring.rows });
        paint();
        if (okMsg) toast(okMsg);
        if (opts.onChange) opts.onChange(d);
        return true;
      }, function (e) {
        busy = false; toast(e.message, true);
        if (e.status === 409) load().then(function () { if (form && form.bring) { pruneBring(form.bring); paint(); } }, function () {});
        return false;
      });
    }
    function viewFlyer(f) {
      var back = h('div', { class: 'pt-lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('flyer'), onclick: function () { close(); } },
        h('img', { src: f.url, alt: t('flyer') }),
        h('button', { type: 'button', class: 'pt-lightbox-x', 'aria-label': t('close') }, icon('no', 2.4)));
      function close() { back.remove(); document.removeEventListener('keydown', onKey); }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey);
      document.body.appendChild(back);
    }
    function load() {
      return api(null).then(function (d) { data = d; err = null; if (d.sig) sig = d.sig; paint(); return d; },
        function (e) { err = e; paint(); throw e; });
    }

    /* ── formatting ─────────────────────────── */
    function longDate(iso) {
      if (!iso) return '';
      var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2], 12);
      var o = { weekday: 'long', month: 'long', day: 'numeric' };
      if (+p[0] !== new Date().getFullYear()) o.year = 'numeric';
      var s = d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', o);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    function timeText(ev) { return [ev.start_time, ev.end_time].filter(Boolean).join(' – '); }
    function whoName(r) { return r.family ? t('familyName', { name: r.name }) : r.name; }
    function party(r) {
      if (r.status === 'no' || !(r.adults + r.kids)) return '';
      return [r.adults ? (r.adults === 1 ? t('adultN') : t('adultsN', { n: r.adults })) : null, r.kids ? (r.kids === 1 ? t('kidN') : t('kidsN', { n: r.kids })) : null].filter(Boolean).join(' · ');
    }
    function mine() { return data && data.rsvps.filter(function (r) { return r.mine; })[0] || null; }
    function shareUrl() { return sig ? location.origin + '/e/' + id + '/' + sig : location.href; }
    function mapLinks(ev) {
      var q = encodeURIComponent((ev.address ? [ev.city ? null : ev.venue, ev.address, ev.city] : [ev.venue, ev.city]).filter(Boolean).join(', '));
      return [['Apple Maps', 'https://maps.apple.com/?daddr=' + q], ['Google Maps', 'https://www.google.com/maps/dir/?api=1&destination=' + q],
        ['Waze', 'https://waze.com/ul?q=' + q + '&navigate=yes']];
    }
    function mapSheet(ev) {
      var s = sheet(t('mapPick'));
      s.body.appendChild(h('div', { class: 'acts' }, mapLinks(ev).map(function (r) {
        return h('a', { class: 'act', href: r[1], target: '_blank', rel: 'noopener', onclick: function () { s.close(); } },
          h('span', { class: 'act-ico' }, icon('pin')), h('span', { text: r[0] }));
      })));
      s.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: s.close }));
    }
    function openMaps(ev) { return function (e) { e.preventDefault(); mapSheet(ev); }; }

    /* ── sheets (team.css bottom-sheet look) ── */
    function sheet(title, sub) {
      var body = h('div', { class: 'pop-body' });
      var back = h('div', { class: 'modal-back pop-back', onclick: function (e) { if (e.target === back) close(); } },
        h('div', { class: 'pop', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'pop-grip' }),
          title ? h('div', { class: 'pop-head' }, h('h3', { text: title }), sub ? h('p', { text: sub }) : null) : null, body));
      function close() { back.remove(); document.removeEventListener('keydown', onKey); }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey);
      document.body.appendChild(back);
      return { body: body, close: close };
    }
    function confirmIt(message, okLabel) {
      return new Promise(function (resolve) {
        var s = sheet(null);
        s.body.appendChild(h('p', { class: 'pop-msg', text: message }));
        s.body.appendChild(h('div', { class: 'pop-btns' },
          h('button', { type: 'button', class: 'btn btn-wide btn-danger-fill', text: okLabel, onclick: function () { s.close(); resolve(true); } }),
          h('button', { type: 'button', class: 'btn btn-wide', text: t('cancel'), onclick: function () { s.close(); resolve(false); } })));
      });
    }
    function calSheet(ev) {
      var s = sheet(t('calPick'));
      var apple = sig ? '/api/calendar?e=' + id + '&s=' + encodeURIComponent(sig) : '/api/calendar?event=' + id;
      var cal = ev.calendar || {};
      var list = h('div', { class: 'acts' });
      [[t('calApple'), apple, false], [t('calGoogle'), cal.google, true], [t('calOutlook'), cal.outlook, true]].forEach(function (r) {
        if (!r[1]) return;
        list.appendChild(h('a', { class: 'act', href: r[1], target: r[2] ? '_blank' : null, rel: r[2] ? 'noopener' : null, onclick: function () { s.close(); } },
          h('span', { class: 'act-ico' }, icon('calendar')), h('span', { text: r[0] })));
      });
      s.body.appendChild(list);
      s.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: s.close }));
    }
    function share(ev) {
      var url = shareUrl(), text = t('shareMsg', { title: ev.title });
      if (navigator.share) { navigator.share({ title: ev.title, text: text, url: url }).catch(function () {}); return; }
      var done = function () { toast(t('copied')); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + ' ' + url).then(done, function () {});
    }

    /* ── sections ───────────────────────────── */
    function hero(ev) {
      var where = [ev.venue, ev.city].filter(Boolean).join(' · ');
      var flyer = ev.flyer, bg = null;
      if (flyer) { bg = h('div', { class: 'pt-hero-bg' }); bg.style.backgroundImage = 'url("' + flyer.url + '")'; }
      return h('section', { class: 'pt-hero' + (flyer ? ' has-flyer' : '') }, bg,
        picado(ev),
        h('div', { class: 'pt-hero-body' },
        flyer ? h('button', { type: 'button', class: 'pt-flyer', 'aria-label': t('flyer'), onclick: function () { viewFlyer(flyer); } },
          h('img', { src: flyer.url, alt: t('flyer'), width: flyer.w, height: flyer.h, decoding: 'async' })) : null,
        h('div', { class: 'pt-hero-in' },
          h('p', { class: 'pt-kind', text: t('invited') }),
          h('h1', { class: 'pt-title', text: ev.title }),
          h('div', { class: 'pt-facts' },
            ev.event_date ? h('div', { class: 'pt-fact' }, h('span', {}, h('b', {}, icon('calendar'), longDate(ev.event_date)), timeText(ev) ? h('span', { text: timeText(ev) }) : null)) : null,
            where || ev.address ? h('a', { class: 'pt-fact', href: mapLinks(ev)[1][1], target: '_blank', rel: 'noopener', onclick: openMaps(ev) },
              h('span', {}, h('b', {}, icon('pin'), where || ev.address), where && ev.address ? h('span', { text: ev.address }) : null)) : null),
          ev.details ? h('p', { class: 'pt-details-text', text: ev.details }) : null,
          h('div', { class: 'pt-hero-acts' },
            ev.event_date && !data.past ? h('button', { type: 'button', class: 'btn btn-sm pt-ghost', onclick: function () { calSheet(ev); } }, icon('calendar'), t('addToCal')) : null,
            where || ev.address ? h('a', { class: 'btn btn-sm pt-ghost', href: mapLinks(ev)[1][1], target: '_blank', rel: 'noopener', onclick: openMaps(ev) }, icon('pin'), t('directions')) : null,
            data.past ? null : h('button', { type: 'button', class: 'btn btn-sm pt-ghost', onclick: function () { share(ev); } }, icon('share'), t('share')),
            !flyer && opts.onFlyer && data.me.owner ? h('button', { type: 'button', class: 'btn btn-sm pt-ghost pt-flyer-add', onclick: function () { opts.onFlyer(ev); } }, icon('image'), t('addFlyer')) : null,
            opts.onAnnounce && data.me.owner && !data.past ? h('button', { type: 'button', class: 'btn btn-sm pt-ghost' + (data.announced ? '' : ' pt-flyer-add'), title: data.announced ? null : t('notAnnounced'),
              onclick: function () { opts.onAnnounce(ev, Boolean(data.announced)); } }, icon('share'), t(data.announced ? 'remind' : 'announce')) : null))));
    }

    function rsvpCard() {
      var me = data.me, r = mine();
      var card = h('section', { class: 'pt-card pt-rsvp' + (r && !form ? ' is-done is-' + r.status : '') });
      if (data.past) {
        card.appendChild(h('p', { class: 'pt-past', text: t('past') }));
        if (opts.onGallery && (data.event.gallery_open || data.event.media_count)) {
          card.appendChild(h('button', { type: 'button', class: 'btn btn-gold btn-wide', onclick: function () { opts.onGallery(data.event); } }, icon('image'), t('photos')));
        }
        return card;
      }
      if (r && !form) {
        var head = r.status === 'yes' ? t('youGoing') : r.status === 'maybe' ? t('youMaybe') : t('youNo');
        card.appendChild(h('div', { class: 'pt-done' },
          h('span', { class: 'pt-done-ico' }, icon(r.status === 'yes' ? 'yes' : r.status, 2.6)),
          h('div', { class: 'pt-done-text' }, h('h2', { class: 'pt-done-title', text: head }),
            h('p', { class: 'pt-done-sub', text: r.status === 'no' ? t('youNoSub') : [whoName(r), party(r)].filter(Boolean).join(' · ') }),
            r.note ? h('p', { class: 'pt-done-note' }, icon('note'), h('span', { text: r.note })) : null,
            myBringing().length ? h('p', { class: 'pt-done-bring' }, icon('pot', 2), h('span', { text: t('bringing') + ': ' + myBringing().join(', ') })) : null)));
        card.appendChild(h('div', { class: 'pt-row-btns' },
          h('button', { type: 'button', class: 'btn btn-sm', text: t('change'), onclick: function () { form = draftFrom(r); paint(); } }),
          h('button', { type: 'button', class: 'btn-link pt-leave', text: t('leave'), onclick: function () {
            confirmIt(t('leaveAsk'), t('remove')).then(function (yes) { if (yes) act({ action: 'leave' }, t('removed')); });
          } })));
        return card;
      }
      var f = form || (form = draftFrom(null)), fam = me.as === 'family';
      card.appendChild(h('h2', { class: 'pt-h2', text: fam ? t('rsvpFamily', { name: me.family_name }) : t('rsvpTitle') }));
      card.appendChild(h('p', { class: 'pt-sub', text: t('rsvpSub') }));
      var name = h('input', { class: 'pt-input', value: f.name, placeholder: fam ? t('familyName', { name: me.family_name }) : t('namePh'), autocomplete: fam ? 'off' : 'name', maxlength: 80, 'aria-label': t('yourName'),
        oninput: function () { f.name = name.value; } });
      card.appendChild(h('label', { class: 'f pt-f' }, h('span', { class: 'f-label pt-h3', text: t('yourName') }), name));
      if (!opts.embedded) {
        if (fam) card.appendChild(h('button', { type: 'button', class: 'btn-link pt-switch', text: t('notYou', { name: me.family_name }),
          onclick: function () { store(GUEST, '1'); form = null; load(); } }));
        else if (me.session_family) card.appendChild(h('button', { type: 'button', class: 'btn-link pt-switch', text: t('asFamily', { name: me.session_family }),
          onclick: function () { store(GUEST, null); form = null; load(); } }));
      }
      var seg = h('div', { class: 'seg pt-seg', role: 'group', 'aria-label': t('rsvpTitle') });
      [['yes', 'going'], ['maybe', 'maybe'], ['no', 'cant']].forEach(function (s) {
        seg.appendChild(h('button', { type: 'button', class: f.status === s[0] ? 'on-' + s[0] : '', 'aria-pressed': f.status === s[0] ? 'true' : 'false',
          onclick: function () { f.status = s[0]; paint(); } }, icon(s[0], 2.6), t(s[1])));
      });
      card.appendChild(seg);
      if (f.status === 'yes' || f.status === 'maybe') card.appendChild(headcount(f));
      if (f.status !== 'no' && potluckOn()) card.appendChild(bringPicker(f));
      var note = h('textarea', { class: 'pt-input', rows: 2, maxlength: 300, placeholder: t('notePh'), oninput: function () { f.note = note.value; } });
      note.value = f.note || '';
      var noteField = h('label', { class: 'f pt-f' }, h('span', { class: 'f-label', text: t('noteLabel') }), note);
      card.appendChild(f.note || f.showNote ? noteField : h('button', { type: 'button', class: 'btn-link pt-add-note', text: t('addNote'),
        onclick: function () { f.showNote = true; paint(); } }));
      card.appendChild(h('div', { class: 'pt-row-btns' },
        h('button', { type: 'button', class: 'btn btn-gold btn-main', text: r ? t('update') : t('send'), onclick: sendRsvp }),
        r ? h('button', { type: 'button', class: 'btn', text: t('cancel'), onclick: function () { form = null; paint(); } }) : null));
      return card;
    }
    var counterIds = 0;
    function headcount(f) {
      var qid = 'pt-q-' + (++counterIds), refreshers = [];
      function refreshAll() { refreshers.forEach(function (fn) { fn(); }); }
      function col(key, label) {
        var out = h('output', { class: 'pt-counter-n', 'aria-live': 'polite', text: String(f[key]) });
        var minus = h('button', { type: 'button', class: 'pt-counter-btn', 'aria-label': label + ': ' + t('less'), onclick: function () { set(f[key] - 1); } }, icon('minus', 2.4));
        var plus = h('button', { type: 'button', class: 'pt-counter-btn', 'aria-label': label + ': ' + t('more'), onclick: function () { set(f[key] + 1); } }, icon('plus', 2.4));
        function set(n) {
          n = Math.max(0, Math.min(30, n));
          if (n + f.adults + f.kids - f[key] === 0) return;
          f[key] = n; out.textContent = String(n); refreshAll();
        }
        refreshers.push(function () { minus.disabled = f[key] <= 0 || f.adults + f.kids <= 1; plus.disabled = f[key] >= 30; });
        return h('div', { class: 'pt-counter-col' }, h('span', { class: 'pt-counter-word', text: label }), h('div', { class: 'pt-counter-row' }, minus, out, plus));
      }
      var el = h('div', { class: 'pt-counter', role: 'group', 'aria-labelledby': qid },
        h('p', { class: 'pt-counter-q', id: qid, text: t('howMany') }),
        h('div', { class: 'pt-counter-cols' }, col('adults', t('adults')), col('kids', t('kids'))),
        h('p', { class: 'pt-hint', text: t('howManyHint') }));
      refreshAll();
      return el;
    }
    function potluckOn() { return data.event.event_type === 'potluck'; }
    function myBringing() {
      return data.items.filter(function (i) { return i.mine || i.claims.some(function (c) { return c.mine; }); }).map(function (i) { return i.label; });
    }
    function bringFrom(r) {
      var out = { claims: {}, extras: [], rows: [{ category: '', text: '' }] };
      if (!r) return out;
      data.items.forEach(function (i) {
        if (i.mine) out.extras.push({ id: i.id, label: i.label, category: i.category });
        i.claims.forEach(function (c) { if (c.mine) out.claims[i.id] = c.note || ''; });
      });
      return out;
    }
    function pruneBring(b) {
      var byId = {}; data.items.forEach(function (i) { byId[i.id] = i; });
      Object.keys(b.claims).forEach(function (k) { if (!byId[k] || byId[k].by) delete b.claims[k]; });
      b.extras = b.extras.filter(function (e) { return !e.id || byId[e.id]; });
    }
    function bringPicker(f) {
      var b = f.bring, byId = {};
      data.rsvps.forEach(function (r) { byId[r.id] = r; });
      var sec = h('div', { class: 'pt-bring' }, h('h3', { class: 'pt-h3', text: t('bringTitle') }));
      if (data.event.potluck_notes) sec.appendChild(h('div', { class: 'pt-ideas' }, h('span', { class: 'pt-ideas-by', text: t('suggestions') }),
        h('p', { text: data.event.potluck_notes })));
      var tiles = {}, counts = {};
      function cat(c) { return CATS.indexOf(c) === -1 ? 'other' : c; }
      function line(c, el, counted) { (tiles[cat(c)] = tiles[cat(c)] || []).push(el); if (counted) counts[cat(c)] = (counts[cat(c)] || 0) + 1; }
      function dish(label, who, cls, btn) {
        return h('li', { class: cls || '' }, h('span', { class: 'pt-dish' }, h('b', { text: label }), who ? h('span', { class: 'pt-who', text: ' · ' + who }) : null), btn || null);
      }
      function unpick(label, fn) { return h('button', { type: 'button', class: 'pt-x', 'aria-label': t('remove') + ': ' + label, onclick: fn }, icon('no', 2.6)); }
      data.items.forEach(function (i) {
        if (i.by) { if (!i.mine) line(i.category, dish(i.label, byId[i.by] && byId[i.by].name), true); return; }
        i.claims.forEach(function (c) { if (!c.mine) line(i.category, dish(i.label, byId[c.rsvp_id] && byId[c.rsvp_id].name), true); });
        if (b.claims[i.id] !== undefined) line(i.category, dish(i.label, t('you'), 'is-mine', unpick(i.label, function () { delete b.claims[i.id]; paint(); })), true);
      });
      b.extras.forEach(function (e, n) { line(e.category, dish(e.label, t('you'), 'is-mine', unpick(e.label, function () { b.extras.splice(n, 1); paint(); })), true); });
      sec.appendChild(h('div', { class: 'pt-menu' }, CATS.filter(function (c) { return c !== 'other' || tiles.other; }).map(function (c) {
        var n = counts[c] || 0;
        return h('div', { class: 'pt-tile' + (n ? '' : ' is-empty') },
          h('div', { class: 'pt-tile-head' }, h('span', { text: STR[lang].cats[c] }), h('b', { text: String(n) })),
          tiles[c] ? h('ul', {}, tiles[c]) : h('p', { class: 'pt-tile-none', text: t('nothingYet') }));
      })));
      var rows = h('div', { class: 'pt-add' }, b.rows.map(function (row, n) {
        var text = h('input', { class: 'pt-input', value: row.text, placeholder: t('bringPh'), maxlength: 80, 'aria-label': t('bringOther'),
          oninput: function () { row.text = text.value; } });
        return h('div', { class: 'pt-dish-row' + (b.rows.length > 1 ? '' : ' is-solo') }, catSelect(row.category, function (v) { row.category = v; }),
          b.rows.length > 1 ? h('button', { type: 'button', class: 'pt-x pt-row-x', 'aria-label': t('removeRow', { n: n + 1 }), onclick: function () {
            b.rows.splice(n, 1); paint();
            root.querySelectorAll('.pt-dish-row .pt-cat-sel')[Math.max(0, n - 1)].focus();
          } }, icon('no', 2.6)) : null,
          text);
      }), h('button', { type: 'button', class: 'btn btn-sm pt-add-more', onclick: function () {
        b.rows.push({ category: '', text: '' }); paint();
        var sels = root.querySelectorAll('.pt-dish-row .pt-cat-sel');
        if (sels.length) sels[sels.length - 1].focus();
      } }, icon('plus', 2.6), t('addAnother')));
      sec.appendChild(rows);
      return sec;
    }
    function draftFrom(r) {
      var fam = data.me.as === 'family';
      var remembered = fam ? data.me.family_name : store('bfmh_party_name') || '';
      var start = { adults: 1, kids: fam ? Math.min(29, data.me.household || 0) : 0 };
      if (r && r.status !== 'no' && r.adults + r.kids) start = { adults: r.adults, kids: r.kids };
      return { name: r ? r.name : remembered, status: r ? r.status : null, adults: start.adults, kids: start.kids, note: r ? r.note || '' : '', bring: bringFrom(r) };
    }
    function sendRsvp() {
      var f = form;
      if (data.me.as !== 'family' && !String(f.name || '').trim()) { toast(t('needName'), true); return; }
      var typed = potluckOn() ? f.bring.rows.filter(function (row) { return row.text.trim(); }) : [];
      var untyped = f.status !== 'no' ? f.bring.rows.indexOf(typed.filter(function (row) { return !row.category; })[0]) : -1;
      if (untyped !== -1) { toast(t('needType'), true); root.querySelectorAll('.pt-dish-row .pt-cat-sel')[untyped].focus(); return; }
      if (!f.status && typed.length) f.status = 'yes';
      if (!f.status) { toast(t('needStatus'), true); return; }
      if (data.me.as !== 'family') store('bfmh_party_name', f.name.trim());
      var was = mine();
      var body = { action: 'rsvp', name: f.name, status: f.status, adults: f.adults, kids: f.kids, note: f.note };
      if (f.status !== 'no' && potluckOn()) {
        var b = f.bring;
        body.bring = { claims: Object.keys(b.claims).map(function (k) { return { item: +k, note: b.claims[k] }; }),
          extras: b.extras.map(function (e) { return e.id ? { id: e.id } : { label: e.label, category: e.category }; })
            .concat(typed.map(function (row) { return { label: row.text.trim(), category: row.category }; })) };
      }
      act(body, was ? t('saved') : t('thanks'))
        .then(function (ok) { if (ok) { form = null; paint(); } });
    }

    function guestsCard() {
      var list = data.rsvps, yes = list.filter(function (r) { return r.status === 'yes'; }),
        maybe = list.filter(function (r) { return r.status === 'maybe'; }), no = list.filter(function (r) { return r.status === 'no'; }), declined = data.declined || no.length;
      var people = yes.reduce(function (n, r) { return n + r.adults + r.kids; }, 0);
      var card = h('section', { class: 'pt-card pt-guests' });
      card.appendChild(h('div', { class: 'pt-card-head' }, h('h2', { class: 'pt-h2', text: t('whoComing') })));
      if (!list.length && !declined) { card.appendChild(h('p', { class: 'pt-empty', text: t('beFirst') })); return card; }
      card.appendChild(h('div', { class: 'pt-count' },
        h('b', { class: 'pt-count-n', text: String(people) }),
        h('div', { class: 'pt-count-side' }, h('span', { class: 'pt-count-l', text: people === 1 ? t('personOne') : t('personMany') }),
          h('span', { class: 'pt-count-s', text: [yes.length ? plural(yes.length, 'rsvpOne', 'rsvpMany') : null, maybe.length ? t('maybeN', { n: maybe.length }) : null,
            declined ? t('cantN', { n: declined }) : null].filter(Boolean).join(' · ') }))));
      var dishes = {};
      if (potluckOn()) data.items.forEach(function (i) {
        if (i.by) (dishes[i.by] = dishes[i.by] || []).push(i.label);
        i.claims.forEach(function (c) { (dishes[c.rsvp_id] = dishes[c.rsvp_id] || []).push(i.label); });
      });
      function row(r) {
        var tappable = data.me.owner, bring = r.status !== 'no' && dishes[r.id];
        return h(tappable ? 'button' : 'div', { type: tappable ? 'button' : null, class: 'pt-guest' + (r.mine ? ' is-mine' : '') + ' is-' + r.status,
          onclick: tappable ? function () { guestSheet(r); } : null },
          h('span', { class: 'pt-av', 'aria-hidden': 'true', text: r.status === 'no' || !(r.adults + r.kids) ? '–' : String(r.adults + r.kids) }),
          h('span', { class: 'pt-guest-main' }, h('b', { text: whoName(r) }), r.status !== 'no' && party(r) ? h('span', { text: party(r) }) : null,
            bring ? h('span', { class: 'pt-guest-bring' }, icon('pot', 2), bring.join(', ')) : null,
            r.note && data.me.owner ? h('em', { class: 'pt-guest-note', text: '“' + r.note + '”' }) : null),
          r.mine ? h('span', { class: 'pt-you', text: t('you') }) : null);
      }
      if (yes.length) card.appendChild(h('div', { class: 'pt-guestlist' }, yes.map(row)));
      if (maybe.length) {
        card.appendChild(h('p', { class: 'pt-label', text: t('maybe') }));
        card.appendChild(h('div', { class: 'pt-guestlist is-quiet' }, maybe.map(row)));
      }
      if (no.length && (data.me.owner || no.some(function (r) { return r.mine; }))) {
        card.appendChild(h('p', { class: 'pt-label', text: t('cant') }));
        card.appendChild(h('div', { class: 'pt-guestlist is-quiet' }, (data.me.owner ? no : no.filter(function (r) { return r.mine; })).map(row)));
      }
      return card;
    }
    function guestSheet(r) {
      var s = sheet(whoName(r), [t(r.status === 'yes' ? 'going' : r.status === 'maybe' ? 'maybe' : 'cant'), party(r)].filter(Boolean).join(' · '));
      if (r.note) s.body.appendChild(h('p', { class: 'pop-msg' }, h('b', { text: t('hostNote') + ': ' }), r.note));
      var acts = h('div', { class: 'acts' }, data.items.map(function (i) {
        var claimed = i.claims.some(function (c) { return c.rsvp_id === r.id; });
        if (i.by !== r.id && !claimed) return null;
        return h('button', { type: 'button', class: 'act', onclick: function () {
          s.close();
          act(i.by === r.id ? { action: 'drop', item: i.id } : { action: 'unclaim', item: i.id, rsvp: r.id }, t('removed'));
        } }, h('span', { class: 'act-ico' }, icon('trash')), h('span', { text: t('removeDish', { item: i.label }) }));
      }), h('button', { type: 'button', class: 'act danger', onclick: function () {
        s.close();
        confirmIt(t('removeAsk', { name: whoName(r) }), t('remove')).then(function (yes) { if (yes) act({ action: 'remove', rsvp: r.id }, t('removed')); });
      } }, h('span', { class: 'act-ico' }, icon('trash')), h('span', { text: t('removeGuest') })));
      s.body.appendChild(acts);
      s.body.appendChild(h('button', { type: 'button', class: 'act-close', text: t('cancel'), onclick: s.close }));
    }

    function catSelect(val, onSet) {
      var sel = h('select', { class: 'pt-input pt-cat-sel', 'aria-label': t('category'), onchange: function () { onSet(sel.value); } },
        [h('option', { value: '', text: t('chooseType'), disabled: true, selected: !val })].concat(
          CATS.map(function (c) { return h('option', { value: c, text: STR[lang].cats[c], selected: c === val }); })));
      sel.classList.toggle('is-blank', !val);
      sel.addEventListener('change', function () { sel.classList.toggle('is-blank', !sel.value); });
      return sel;
    }
    function paint() {
      root.innerHTML = '';
      root.classList.add('pt-root');
      if (err) {
        root.appendChild(h('div', { class: 'pt pt-error' }, picado(), h('p', { text: err.status === 403 || err.status === 404 ? t('invalid') : err.message }),
          err.status >= 500 || !err.status ? h('button', { type: 'button', class: 'btn btn-gold', text: t('tryAgain'), onclick: load }) : null));
        return;
      }
      if (!data) { root.appendChild(h('div', { class: 'pt pt-loading' }, picado(), h('p', { text: t('loading') }))); return; }
      var ev = data.event;
      var wrap = h('div', { class: 'pt' + (data.past ? ' is-past' : '') },
        hero(ev),
        h('div', { class: 'pt-cols' },
          h('div', { class: 'pt-col' }, rsvpCard()),
          h('div', { class: 'pt-col' }, guestsCard())),
        !opts.embedded && data.me.owner ? h('a', { class: 'pt-applink', href: '/team/' }, icon('link'), t('openInApp')) : null,
        h('footer', { class: 'pt-foot' }, h('img', { src: '/images/optimized/logo-dancers-color.webp', alt: '' }),
          h('span', {}, t('hosted') + ' ', h('b', { class: 'notranslate', translate: 'no', text: 'Ballet Folklórico Mi Herencia' }))));
      root.appendChild(wrap);
      if (!opts.embedded) document.title = ev.title + ' · Ballet Folklórico Mi Herencia';
    }

    loadPicado();
    paint();
    if (!id) { err = { status: 404 }; paint(); } else load().catch(function () {});
    return {
      reload: load,
      setLang: function (l) { lang = l === 'es' ? 'es' : 'en'; paint(); },
      data: function () { return data; },
    };
  }

  window.BFMHParty = { mount: mount, STR: STR };

  var app = document.getElementById('app');
  if (app && (app.dataset.party || app.dataset.partyInvalid) && document.body.classList.contains('party-standalone')) {
    var lang = 'en';
    try { var saved = localStorage.getItem('bfmh_team_lang'); lang = saved === 'es' || saved === 'en' ? saved : /^es/i.test(navigator.language || '') ? 'es' : 'en'; } catch (e) {}
    document.documentElement.lang = lang;
    var ctl = mount(app, { id: app.dataset.party || 0, sig: app.dataset.s, lang: lang });
    var right = document.getElementById('header-right');
    var toggle = h('button', { type: 'button', class: 'btn btn-sm lang-toggle', 'aria-label': 'Cambiar idioma / Switch language' });
    var paintToggle = function () { toggle.textContent = lang === 'en' ? 'Español' : 'English'; };
    toggle.addEventListener('click', function () {
      lang = lang === 'en' ? 'es' : 'en'; document.documentElement.lang = lang;
      try { localStorage.setItem('bfmh_team_lang', lang); } catch (e) {}
      paintToggle(); ctl.setLang(lang);
    });
    paintToggle();
    if (right) right.appendChild(toggle);
  }
})();
