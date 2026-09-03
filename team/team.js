/* Team availability app: owners (password) and families (invite link). */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var tabsEl = document.getElementById('tabs');
  var headerRight = document.getElementById('header-right');
  var state = { me: null, events: [], families: [], botLog: null, tab: 'inbox', focusEvent: null, lang: 'en' };

  /* ── i18n ───────────────────────────────────────────────── */
  var STR = {
    en: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      status: { inquiry: 'New inquiry', open: 'Open', confirmed: 'Confirmed', done: 'Done', declined: 'Declined', cancelled: 'Cancelled' },
      types: { festival: 'Cultural Festival', quinceanera: 'Quinceañera', wedding: 'Wedding', private: 'Private Event', corporate: 'Corporate Event', school: 'School Assembly', classes: 'Classes', other: 'Other' },
      dateTbd: 'Date TBD', date: 'Date', tbd: 'TBD', performance: 'Performance', untitled: 'Untitled',
      callTime: 'Call time', dancersNeeded: '{n} dancers needed', pay: 'Pay', rehearsals: 'Rehearsals', whosIn: "Who's in",
      yes: 'yes', maybe: 'maybe', no: 'no', noAnswer: 'no answer',
      btnYes: '✓ Yes', btnMaybe: '? Maybe', btnNo: '✗ No', availabilityFor: 'Availability for {name}',
      signOut: 'Sign out', familia: 'Familia', owner: 'Owner', newGig: '+ New gig',
      loginTitle: 'Team sign-in', loginText: 'Dancers and families: open the personal link the owners sent you — no password needed. Owners: sign in below.',
      ownerPassword: 'Owner password', signIn: 'Sign in', notConfigured: 'ADMIN_PASSWORD is not set on the server yet.',
      badLink: 'That link is not valid anymore. Ask the owners for a new one.',
      needsAnswer: 'Needs your answer', upcoming: 'Upcoming', recent: 'Recent', myFamily: 'My family',
      addDancersFirst: 'Add the dancers in your family below so you can mark availability for each of them.',
      allAnswered: 'Everything else is answered. ¡Gracias!', noGigs: 'No gigs posted yet. The owners will post here when an inquiry comes in.',
      answerCleared: 'Answer cleared', dancers: 'Dancers', addDancerPh: 'Add a dancer (e.g. Sofia)', dancerName: 'Dancer name', add: 'Add',
      removeDancer: 'Remove {name} from your family?', remove: 'Remove', emailForNotif: 'Email for notifications', phone: 'Phone',
      saveContact: 'Save contact info', saved: 'Saved', copied: 'Copied — paste it into GroupMe', copyFail: 'Could not copy',
      tabInbox: 'Inbox', tabGigs: 'Gigs', tabTeam: 'Team',
      groupmeOn: 'GroupMe bot connected', groupmeOff: 'GroupMe bot not set up — use “Copy message”', emailOn: 'Email connected', emailOff: 'Email not set up',
      newInquiries: 'New inquiries', inboxSub: 'Every message from the website contact and quote forms lands here automatically.', inboxClear: 'Inbox is clear.',
      archived: 'Declined / cancelled', posted: 'Posted to the team', gigsSub: 'Open a gig to see who answered, send a reminder, add rehearsals, and confirm.',
      nothingPosted: 'Nothing posted yet. Post an inquiry from the Inbox, or create a new gig.', past: 'Past',
      from: 'From', email: 'Email', type: 'Type', received: 'Received', via: 'via',
      askGroup: '🙋 Ask GroupMe who’s available', askAgain: 'Ask again in GroupMe', copyAsk: 'Copy the question', postTally: 'Post tally to GroupMe',
      askedLine: 'Bot asked {when} · {n} of {total} answered', askedNever: 'Not asked in GroupMe yet', askedToast: 'Asked in GroupMe — replies will fill in the roster', askedCopy: 'Gig opened — the bot is not connected, so the question was copied for you to paste',
      justNow: 'just now', minsAgo: '{n} min ago', hoursAgo: '{n} h ago', daysAgo: '{n} d ago',
      postToTeam: 'Post to team…', edit: 'Edit', decline: 'Decline', rosterDetails: 'Roster & details', reopen: 'Reopen as inquiry', del: 'Delete',
      deleteConfirm: 'Delete “{title}” permanently?', thisEvent: 'this event', done: 'Done', donePosted: 'Done — posted to {ch}', groupme: 'GroupMe', emailCh: 'email', and: ' and ',
      title: 'Title', titlePh: 'e.g. Quinceañera — Lopez family', typeLabel: 'Type', typePh: '— type —', dateLabel: 'Date', startTime: 'Start time', endTime: 'End time',
      dancersNeededLabel: 'Dancers needed', venue: 'Venue', city: 'City', address: 'Address', payLabel: 'Pay (shown to team, optional)', payPh: '$50 per dancer',
      clientWrote: 'Client wrote (date & city)', detailsForTeam: 'Details for the team', detailsPh: 'Costume, dances, parking, what to bring…',
      rehearsalsLabel: 'Rehearsals (shown to the team)', rehearsalDate: 'Rehearsal date', time: 'Time', locationNote: 'Location / note', addRehearsal: '+ Add rehearsal',
      clientSection: 'Client contact & private notes', clientName: 'Client name', clientEmail: 'Client email', clientPhone: 'Client phone', clientMessage: 'Client message',
      privateNotes: 'Private notes (owners only)', notifyNow: ' Notify the team now (GroupMe bot / email, if connected)',
      needTitle: 'Give the gig a title.', create: 'Create', save: 'Save', cancel: 'Cancel', close: 'Close',
      modalPost: 'Post to the team', modalNew: 'New gig', modalEdit: 'Edit gig',
      postedGroupme: 'Posted to the team and GroupMe', postedCopy: 'Posted to the team — copy the announcement into GroupMe',
      rosterByFamily: 'Roster by family', tapToChange: 'Tap to change', tapHint: 'Tap a name to set it on their behalf (yes → maybe → no → clear).',
      editDetails: 'Edit details', copyAnnouncement: 'Copy announcement', sendReminder: 'Send reminder', copyReminder: 'Copy reminder', confirmGig: 'Confirm gig',
      confirmAsk: 'Confirm this gig? Families who said yes will be notified (if a channel is connected).', cancelGig: 'Cancel gig', cancelAsk: 'Cancel this gig?',
      copyConfirmation: 'Copy confirmation', markDone: 'Mark done', gig: 'Gig',
      botTitle: 'GroupMe bot', botSubOn: 'The bot reads the team chat. When someone writes “Ana and Sofia can go” or “no podemos el 9/20”, it marks those dancers on the matching gig and replies with what it understood. Anything it got wrong: tap the chips in the gig roster.',
      botSubOff: 'Not listening yet. Set GROUPME_WEBHOOK_SECRET on the server and point the bot’s callback URL at /api/webhooks/groupme?secret=… (see README).',
      botEmpty: 'No messages read yet.', botIgnored: 'Ignored', botNoDancers: 'Could not tell which dancer', botUnknownSender: 'Unknown sender — no dancer named', botNoEvent: 'No open gig to apply it to', botGuessed: '(assumed latest gig)', botLinked: 'GroupMe linked', botAmbiguous: 'Ambiguous name: {names}', botNoDate: 'No gig on that date', botVague: 'Long message with no date — not applied',
      addFamilyFrom: 'Add this family', reread: 'Read again', addFamilyHint: 'From GroupMe name “{name}”. Check the spelling of each dancer — the bot matches these names in the chat.',
      onWebsite: 'On website', showOnWebsite: 'Show on website', hideFromWebsite: 'Hide from website', websiteOn: 'Now listed on bfmh.dance', websiteOff: 'Removed from bfmh.dance',
      familiesTitle: 'Families & dancers', familiesSub: 'Each family gets one private link. Send it to them once (GroupMe DM or text); they tap it and can answer for every dancer in their household.',
      familyNamePh: 'Family name (e.g. Garcia)', emailOpt: 'Email (optional)', phoneOpt: 'Phone (optional)', dancersPh: 'Dancers, comma separated (e.g. Luis, Elena)',
      newFamily: 'New family', addFamily: 'Add family', familyAdded: 'Family added', noFamilies: 'No families yet.', noContact: 'No contact info',
      removeAsk: 'Remove {name}?', addDancer: 'Add dancer', copyInvite: 'Copy invite link', newLink: 'New link', newLinkTitle: 'Invalidates the old link',
      newLinkAsk: 'Create a new link for {name}? The old one will stop working.', removeFamily: 'Remove family', removeFamilyAsk: 'Remove the {name} family and their dancers?',
      annHead: '📣 New gig: are you available?', annTime: 'Time', annWhere: 'Where', annDancers: 'Dancers needed', annLink: 'Mark your availability',
      confHead: '✅ CONFIRMED', confDancers: 'Dancers', confDetails: 'Details',
      remHead: '⏰ Reminder — {title} on {date}.', remMissing: 'Still need an answer from: {names}.', remAll: 'Everyone has answered, thank you!',
    },
    es: {
      months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      status: { inquiry: 'Nueva solicitud', open: 'Abierto', confirmed: 'Confirmado', done: 'Terminado', declined: 'Rechazado', cancelled: 'Cancelado' },
      types: { festival: 'Festival cultural', quinceanera: 'Quinceañera', wedding: 'Boda', private: 'Evento privado', corporate: 'Evento corporativo', school: 'Asamblea escolar', classes: 'Clases', other: 'Otro' },
      dateTbd: 'Fecha por confirmar', date: 'Fecha', tbd: '¿?', performance: 'Presentación', untitled: 'Sin título',
      callTime: 'Hora de llegada', dancersNeeded: 'Se necesitan {n} bailarines', pay: 'Pago', rehearsals: 'Ensayos', whosIn: 'Quién va',
      yes: 'sí', maybe: 'tal vez', no: 'no', noAnswer: 'sin respuesta',
      btnYes: '✓ Sí', btnMaybe: '? Tal vez', btnNo: '✗ No', availabilityFor: 'Disponibilidad de {name}',
      signOut: 'Salir', familia: 'Familia', owner: 'Dueño', newGig: '+ Nuevo evento',
      loginTitle: 'Acceso del equipo', loginText: 'Bailarines y familias: abran el enlace personal que les enviaron los dueños — no necesitan contraseña. Dueños: inicien sesión abajo.',
      ownerPassword: 'Contraseña de dueño', signIn: 'Entrar', notConfigured: 'ADMIN_PASSWORD todavía no está configurado en el servidor.',
      badLink: 'Ese enlace ya no es válido. Pide uno nuevo a los dueños.',
      needsAnswer: 'Falta tu respuesta', upcoming: 'Próximos', recent: 'Recientes', myFamily: 'Mi familia',
      addDancersFirst: 'Agrega abajo a los bailarines de tu familia para marcar la disponibilidad de cada uno.',
      allAnswered: 'Todo lo demás ya está respondido. ¡Gracias!', noGigs: 'Aún no hay eventos publicados. Los dueños publicarán aquí cuando llegue una solicitud.',
      answerCleared: 'Respuesta borrada', dancers: 'Bailarines', addDancerPh: 'Agregar bailarín (p. ej. Sofía)', dancerName: 'Nombre del bailarín', add: 'Agregar',
      removeDancer: '¿Quitar a {name} de tu familia?', remove: 'Quitar', emailForNotif: 'Correo para avisos', phone: 'Teléfono',
      saveContact: 'Guardar contacto', saved: 'Guardado', copied: 'Copiado — pégalo en GroupMe', copyFail: 'No se pudo copiar',
      tabInbox: 'Solicitudes', tabGigs: 'Eventos', tabTeam: 'Equipo',
      groupmeOn: 'Bot de GroupMe conectado', groupmeOff: 'Bot de GroupMe sin configurar — usa “Copiar mensaje”', emailOn: 'Correo conectado', emailOff: 'Correo sin configurar',
      newInquiries: 'Nuevas solicitudes', inboxSub: 'Cada mensaje del formulario de contacto y de cotización del sitio llega aquí automáticamente.', inboxClear: 'No hay solicitudes pendientes.',
      archived: 'Rechazados / cancelados', posted: 'Publicados al equipo', gigsSub: 'Abre un evento para ver quién respondió, enviar un recordatorio, agregar ensayos y confirmar.',
      nothingPosted: 'Nada publicado todavía. Publica una solicitud desde Solicitudes o crea un evento nuevo.', past: 'Pasados',
      from: 'De', email: 'Correo', type: 'Tipo', received: 'Recibido', via: 'vía',
      askGroup: '🙋 Preguntar en GroupMe quién puede', askAgain: 'Volver a preguntar en GroupMe', copyAsk: 'Copiar la pregunta', postTally: 'Publicar el conteo en GroupMe',
      askedLine: 'El bot preguntó {when} · {n} de {total} respondieron', askedNever: 'Aún no se ha preguntado en GroupMe', askedToast: 'Preguntado en GroupMe — las respuestas llenarán la lista', askedCopy: 'Evento abierto — el bot no está conectado, así que se copió la pregunta para pegarla',
      justNow: 'ahora mismo', minsAgo: 'hace {n} min', hoursAgo: 'hace {n} h', daysAgo: 'hace {n} d',
      postToTeam: 'Publicar al equipo…', edit: 'Editar', decline: 'Rechazar', rosterDetails: 'Lista y detalles', reopen: 'Reabrir como solicitud', del: 'Eliminar',
      deleteConfirm: '¿Eliminar “{title}” permanentemente?', thisEvent: 'este evento', done: 'Listo', donePosted: 'Listo — publicado en {ch}', groupme: 'GroupMe', emailCh: 'correo', and: ' y ',
      title: 'Título', titlePh: 'p. ej. Quinceañera — familia López', typeLabel: 'Tipo', typePh: '— tipo —', dateLabel: 'Fecha', startTime: 'Hora de inicio', endTime: 'Hora de fin',
      dancersNeededLabel: 'Bailarines necesarios', venue: 'Lugar', city: 'Ciudad', address: 'Dirección', payLabel: 'Pago (visible al equipo, opcional)', payPh: '$50 por bailarín',
      clientWrote: 'El cliente escribió (fecha y ciudad)', detailsForTeam: 'Detalles para el equipo', detailsPh: 'Vestuario, bailes, estacionamiento, qué traer…',
      rehearsalsLabel: 'Ensayos (visibles al equipo)', rehearsalDate: 'Fecha del ensayo', time: 'Hora', locationNote: 'Lugar / nota', addRehearsal: '+ Agregar ensayo',
      clientSection: 'Contacto del cliente y notas privadas', clientName: 'Nombre del cliente', clientEmail: 'Correo del cliente', clientPhone: 'Teléfono del cliente', clientMessage: 'Mensaje del cliente',
      privateNotes: 'Notas privadas (solo dueños)', notifyNow: ' Avisar al equipo ahora (bot de GroupMe / correo, si están conectados)',
      needTitle: 'Ponle un título al evento.', create: 'Crear', save: 'Guardar', cancel: 'Cancelar', close: 'Cerrar',
      modalPost: 'Publicar al equipo', modalNew: 'Nuevo evento', modalEdit: 'Editar evento',
      postedGroupme: 'Publicado al equipo y en GroupMe', postedCopy: 'Publicado al equipo — copia el anuncio en GroupMe',
      rosterByFamily: 'Lista por familia', tapToChange: 'Toca para cambiar', tapHint: 'Toca un nombre para responder por esa persona (sí → tal vez → no → borrar).',
      editDetails: 'Editar detalles', copyAnnouncement: 'Copiar anuncio', sendReminder: 'Enviar recordatorio', copyReminder: 'Copiar recordatorio', confirmGig: 'Confirmar evento',
      confirmAsk: '¿Confirmar este evento? Se avisará a las familias que dijeron que sí (si hay un canal conectado).', cancelGig: 'Cancelar evento', cancelAsk: '¿Cancelar este evento?',
      copyConfirmation: 'Copiar confirmación', markDone: 'Marcar terminado', gig: 'Evento',
      botTitle: 'Bot de GroupMe', botSubOn: 'El bot lee el chat del grupo. Cuando alguien escribe “Ana y Sofía sí pueden” o “no podemos el 9/20”, marca a esos bailarines en el evento correspondiente y responde con lo que entendió. Si se equivoca, toca las fichas en la lista del evento.',
      botSubOff: 'Todavía no escucha. Configura GROUPME_WEBHOOK_SECRET en el servidor y apunta la URL de callback del bot a /api/webhooks/groupme?secret=… (ver README).',
      botEmpty: 'Aún no ha leído mensajes.', botIgnored: 'Ignorado', botNoDancers: 'No supo de qué bailarín se trata', botUnknownSender: 'Remitente desconocido — no nombró a ningún bailarín', botNoEvent: 'No hay evento abierto', botGuessed: '(asumió el evento más reciente)', botLinked: 'GroupMe vinculado', botAmbiguous: 'Nombre ambiguo: {names}', botNoDate: 'No hay evento en esa fecha', botVague: 'Mensaje largo sin fecha — no se aplicó',
      addFamilyFrom: 'Agregar esta familia', reread: 'Leer de nuevo', addFamilyHint: 'Del nombre de GroupMe “{name}”. Revisa cómo se escribe cada bailarín — el bot busca esos nombres en el chat.',
      onWebsite: 'En el sitio web', showOnWebsite: 'Mostrar en el sitio web', hideFromWebsite: 'Quitar del sitio web', websiteOn: 'Ya aparece en bfmh.dance', websiteOff: 'Quitado de bfmh.dance',
      familiesTitle: 'Familias y bailarines', familiesSub: 'Cada familia recibe un enlace privado. Envíaselo una vez (mensaje directo de GroupMe o texto); al abrirlo pueden responder por todos los bailarines de su casa.',
      familyNamePh: 'Apellido de la familia (p. ej. García)', emailOpt: 'Correo (opcional)', phoneOpt: 'Teléfono (opcional)', dancersPh: 'Bailarines separados por comas (p. ej. Luis, Elena)',
      newFamily: 'Nueva familia', addFamily: 'Agregar familia', familyAdded: 'Familia agregada', noFamilies: 'Todavía no hay familias.', noContact: 'Sin datos de contacto',
      removeAsk: '¿Quitar a {name}?', addDancer: 'Agregar bailarín', copyInvite: 'Copiar enlace', newLink: 'Nuevo enlace', newLinkTitle: 'Invalida el enlace anterior',
      newLinkAsk: '¿Crear un nuevo enlace para {name}? El anterior dejará de funcionar.', removeFamily: 'Quitar familia', removeFamilyAsk: '¿Quitar a la familia {name} y a sus bailarines?',
      annHead: '📣 Nuevo evento: ¿están disponibles?', annTime: 'Hora', annWhere: 'Dónde', annDancers: 'Bailarines necesarios', annLink: 'Marca tu disponibilidad',
      confHead: '✅ CONFIRMADO', confDancers: 'Bailarines', confDetails: 'Detalles',
      remHead: '⏰ Recordatorio — {title} el {date}.', remMissing: 'Todavía falta la respuesta de: {names}.', remAll: '¡Ya respondieron todos, gracias!',
    },
  };
  function t(key, vars) {
    var s = STR[state.lang][key]; if (s === undefined) s = STR.en[key]; if (s === undefined) s = key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function detectLang() {
    try { var saved = localStorage.getItem('bfmh_team_lang'); if (saved === 'en' || saved === 'es') return saved; } catch (e) {}
    return /^es/i.test(navigator.language || '') ? 'es' : 'en';
  }
  function setLang(l) {
    state.lang = l; document.documentElement.lang = l;
    try { localStorage.setItem('bfmh_team_lang', l); } catch (e) {}
    render();
  }
  function langToggle() {
    var other = state.lang === 'en' ? 'es' : 'en';
    return h('button', { class: 'btn btn-sm lang-toggle', text: other === 'es' ? 'Español' : 'English', 'aria-label': 'Cambiar idioma / Switch language', onclick: function () { setLang(other); } });
  }
  state.lang = detectLang(); document.documentElement.lang = state.lang;

  /* ── utilities ─────────────────────────────────────────── */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === false || v == null) return;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  function parseDate(s) { if (!s) return null; var p = s.slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function fmtDate(s) {
    var d = parseDate(s); if (!d) return t('dateTbd');
    var M = t('months'), D = t('days');
    return state.lang === 'es' ? D[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()].toLowerCase() + ' ' + d.getFullYear()
                              : D[d.getDay()] + ', ' + M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function fmtTime(ev) { return [ev.start_time, ev.end_time].filter(Boolean).join(' – '); }
  function fmtWhere(ev) { return [ev.venue, ev.city].filter(Boolean).join(' · '); }
  function isPast(ev) { var d = parseDate(ev.event_date); return d && d < new Date(new Date().setHours(0, 0, 0, 0)); }
  function typeLabel(k) { return t('types')[k] || k; }
  function timeAgo(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 2) return t('justNow'); if (m < 60) return t('minsAgo', { n: m });
    if (m < 48 * 60) return t('hoursAgo', { n: Math.round(m / 60) }); return t('daysAgo', { n: Math.round(m / 1440) });
  }
  function askedLine(ev) {
    if (!(state.me.channels && state.me.channels.groupme)) return null;
    if (!ev.asked_at) return h('p', { class: 'hint', text: t('askedNever') });
    var total = 0; (state.families || []).forEach(function (f) { f.dancers.forEach(function (d) { if (d.active !== false) total++; }); });
    return h('p', { class: 'hint', text: t('askedLine', { when: timeAgo(ev.asked_at), n: (ev.availability || []).length, total: total }) });
  }
  function askGroup(ev, after) {
    return api('/api/events/' + ev.id, { method: 'PATCH', body: { action: 'ask' } }).then(function (d) {
      if (d.notified && d.notified.groupme) toast(t('askedToast')); else { copyText(d.notified.text); toast(t('askedCopy')); }
      if (ev.status === 'inquiry') state.tab = 'gigs';
      return refresh().then(after || null);
    }).catch(function (e) { toast(e.message, true); });
  }
  function evTitle(ev) { return ev.title || (ev.event_type ? typeLabel(ev.event_type) : t('performance')); }

  var toastTimer;
  function toast(msg, isErr) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.className = 'tm-toast' + (isErr ? ' err' : ''); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, isErr ? 5000 : 2600);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { toast(t('copied')); });
    var ta = h('textarea', { text: text }); document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t('copied')); } catch (e) { toast(t('copyFail'), true); }
    ta.remove(); return Promise.resolve();
  }

  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    return fetch(path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var e = new Error(data.error || ('Request failed (' + r.status + ')')); e.status = r.status; throw e; }
        return data;
      });
    });
  }

  /* ── data loading ──────────────────────────────────────── */
  function loadMe() { return api('/api/me').then(function (me) { state.me = me; return me; }); }
  function loadEvents() { return api('/api/events').then(function (d) { state.events = d.events; }); }
  function loadFamilies() { return api('/api/families').then(function (d) { state.families = d.families; }); }
  function loadBotLog() { return api('/api/groupme?limit=40').then(function (d) { state.botLog = d.messages; }).catch(function () { state.botLog = []; }); }
  function refresh() {
    var jobs = [loadEvents()];
    if (state.me.role === 'admin') { jobs.push(loadFamilies()); if (state.tab === 'team') jobs.push(loadBotLog()); }
    return Promise.all(jobs).then(render, function (e) { toast(e.message, true); });
  }

  /* ── boot ───────────────────────────────────────────────── */
  function boot() {
    var params = new URLSearchParams(location.search);
    var key = params.get('k');
    if (params.get('lang') === 'es' || params.get('lang') === 'en') setLangSilently(params.get('lang'));
    var chain = Promise.resolve();
    if (key) {
      chain = api('/api/auth', { method: 'POST', body: { key: key } }).then(function () {
        history.replaceState(null, '', location.pathname + location.hash);
      }).catch(function () { toast(t('badLink'), true); });
    }
    var m = location.hash.match(/^#event-(\d+)/);
    if (m) state.focusEvent = +m[1];
    chain.then(loadMe).then(function (me) {
      if (me.role === 'anon') { renderLogin(); return; }
      if (me.role === 'admin') state.tab = 'inbox';
      return refresh();
    }).catch(function (e) { app.innerHTML = ''; app.appendChild(h('p', { class: 'tm-empty', text: e.message })); });
  }
  function setLangSilently(l) { state.lang = l; document.documentElement.lang = l; try { localStorage.setItem('bfmh_team_lang', l); } catch (e) {} }

  /* ── login ──────────────────────────────────────────────── */
  function renderLogin() {
    tabsEl.hidden = true; headerRight.innerHTML = ''; headerRight.appendChild(langToggle()); app.innerHTML = '';
    var err = h('p', { class: 'error' });
    var pw = h('input', { type: 'password', autocomplete: 'current-password', placeholder: t('ownerPassword') });
    var form = h('form', { class: 'login', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      api('/api/auth', { method: 'POST', body: { password: pw.value } }).then(function () { location.reload(); })
        .catch(function (x) { err.textContent = x.message; });
    } },
      h('h1', { text: t('loginTitle') }),
      h('p', { text: t('loginText') }),
      h('label', { class: 'f' }, t('ownerPassword'), pw),
      h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('signIn') })),
      err,
      state.me && state.me.configured === false ? h('p', { class: 'hint', text: t('notConfigured') }) : null
    );
    app.appendChild(form);
  }

  function signOut() { api('/api/auth', { method: 'DELETE' }).then(function () { location.href = '/team/'; }); }

  /* ── shared rendering pieces ───────────────────────────── */
  function dateBox(ev) {
    var d = parseDate(ev.event_date);
    if (!d) return h('div', { class: 'card-date' }, h('span', { class: 'm', text: t('date') }), h('span', { class: 'd', text: '?' }), h('span', { class: 'w', text: t('tbd') }));
    return h('div', { class: 'card-date' }, h('span', { class: 'm', text: t('months')[d.getMonth()] }), h('span', { class: 'd', text: d.getDate() }), h('span', { class: 'w', text: t('days')[d.getDay()] }));
  }
  function pill(status) { return h('span', { class: 'pill pill-' + status, text: t('status')[status] || status }); }
  function metaLine(ev) {
    var parts = [];
    if (fmtTime(ev)) parts.push(h('span', {}, h('b', { text: fmtTime(ev) })));
    if (ev.call_time) parts.push(h('span', { text: t('callTime') + ' ' + ev.call_time }));
    if (fmtWhere(ev)) parts.push(h('span', { text: fmtWhere(ev) }));
    if (ev.dancers_needed) parts.push(h('span', { text: t('dancersNeeded', { n: ev.dancers_needed }) }));
    if (ev.pay) parts.push(h('span', { text: t('pay') + ': ' + ev.pay }));
    var out = h('p', { class: 'card-meta' });
    parts.forEach(function (p, i) { if (i) out.appendChild(document.createTextNode('  ·  ')); out.appendChild(p); });
    return parts.length ? out : null;
  }
  function rehearsalLine(r) { return [fmtDate(r.date), r.time, r.location ? '@ ' + r.location : null, r.note ? '— ' + r.note : null].filter(Boolean).join(' '); }
  function rehearsalList(ev) {
    var list = ev.rehearsals || [];
    if (!list.length) return null;
    return h('div', { class: 'card-body' }, h('b', { text: t('rehearsals') }),
      h('ul', { class: 'rehearsals' }, list.map(function (r) { return h('li', { text: rehearsalLine(r) }); })));
  }
  function whoChips(ev) {
    var av = ev.availability || [];
    if (!av.length) return null;
    var order = { yes: 0, maybe: 1, no: 2 };
    av = av.slice().sort(function (a, b) { return order[a.status] - order[b.status] || a.dancer_name.localeCompare(b.dancer_name); });
    return h('div', { class: 'who' }, av.map(function (a) { return h('span', { class: 'chip ' + a.status, text: a.dancer_name, title: a.note || '' }); }));
  }
  function breakdown(ev, roster, onTap) {
    var groups = { yes: [], maybe: [], no: [], pending: [] };
    var answered = {};
    (ev.availability || []).forEach(function (a) { answered[a.dancer_id] = true; groups[a.status].push({ id: a.dancer_id, name: a.dancer_name, status: a.status, note: a.note }); });
    var fams = roster || state.families;
    (fams || []).forEach(function (f) { f.dancers.forEach(function (d) { if (d.active !== false && !answered[d.id]) groups.pending.push({ id: d.id, name: d.name, status: null }); }); });
    var box = h('div', { class: 'breakdown' + (onTap ? ' tappable' : '') });
    [['yes', 'yes'], ['maybe', 'maybe'], ['no', 'no'], ['pending', 'noAnswer']].forEach(function (g) {
      var people = groups[g[0]].slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      var names = h('span', { class: 'bd-names' });
      if (!people.length) names.textContent = '—';
      people.forEach(function (p, i) {
        if (i) names.appendChild(document.createTextNode(', '));
        names.appendChild(onTap
          ? h('button', { class: 'bd-name', text: p.name, title: p.note || t('tapToChange'), onclick: function () { onTap(p); } })
          : h('span', { text: p.name, title: p.note || '' }));
      });
      box.appendChild(h('div', { class: 'bd-row ' + g[0] }, h('span', { class: 'bd-label' }, h('b', { text: people.length }), ' ' + t(g[1])), names));
    });
    return box;
  }
  function tapCycle(ev, p) {
    var next = { yes: 'maybe', maybe: 'no', no: null }; var s = p.status ? next[p.status] : 'yes';
    api('/api/availability', { method: 'POST', body: { event_id: ev.id, dancer_id: p.id, status: s } })
      .then(function () { toast(s ? p.name + ': ' + t(s) : t('answerCleared')); return loadEvents(); }).then(render)
      .catch(function (e) { toast(e.message, true); });
  }
  function counts(ev, roster) {
    var c = { yes: 0, maybe: 0, no: 0, pending: 0 };
    (ev.availability || []).forEach(function (a) { c[a.status]++; });
    if (roster) roster.forEach(function (f) { f.dancers.forEach(function (d) { if (!d.status) c.pending++; }); });
    else if (state.families.length) { var total = 0; state.families.forEach(function (f) { f.dancers.forEach(function (d) { if (d.active) total++; }); }); c.pending = Math.max(0, total - c.yes - c.maybe - c.no); }
    return h('div', { class: 'counts' },
      h('span', { class: 'yes' }, h('b', { text: c.yes }), ' ' + t('yes')),
      h('span', { class: 'maybe' }, h('b', { text: c.maybe }), ' ' + t('maybe')),
      h('span', { class: 'no' }, h('b', { text: c.no }), ' ' + t('no')),
      h('span', { class: 'pending' }, h('b', { text: c.pending }), ' ' + t('noAnswer')));
  }

  /* ── member view ───────────────────────────────────────── */
  function renderMember() {
    var me = state.me;
    tabsEl.hidden = true;
    headerRight.innerHTML = '';
    headerRight.appendChild(h('span', {}, t('familia') + ' ', h('strong', { text: me.family.name })));
    headerRight.appendChild(langToggle());
    headerRight.appendChild(h('button', { class: 'btn btn-sm', text: t('signOut'), onclick: signOut }));
    app.innerHTML = '';

    var mine = {}; me.dancers.forEach(function (d) { mine[d.id] = d; });
    function myAnswers(ev) { var out = {}; (ev.availability || []).forEach(function (a) { if (mine[a.dancer_id]) out[a.dancer_id] = a; }); return out; }
    var needs = [], upcoming = [], past = [];
    state.events.forEach(function (ev) {
      if (isPast(ev) || ev.status === 'done') { past.push(ev); return; }
      var ans = myAnswers(ev);
      if (ev.status === 'open' && me.dancers.some(function (d) { return !ans[d.id]; })) needs.push(ev); else upcoming.push(ev);
    });

    if (!me.dancers.length) app.appendChild(h('div', { class: 'card' }, h('p', { class: 'card-meta', text: t('addDancersFirst') })));
    if (needs.length) { app.appendChild(h('h2', { class: 'tm-h2', text: t('needsAnswer') })); needs.forEach(function (ev) { app.appendChild(memberCard(ev, myAnswers(ev))); }); }
    app.appendChild(h('h2', { class: 'tm-h2', text: t('upcoming') }));
    if (!upcoming.length) app.appendChild(h('p', { class: 'tm-empty', text: needs.length ? t('allAnswered') : t('noGigs') }));
    upcoming.forEach(function (ev) { app.appendChild(memberCard(ev, myAnswers(ev))); });
    if (past.length) { app.appendChild(h('h2', { class: 'tm-h2', text: t('recent') })); past.forEach(function (ev) { app.appendChild(memberCard(ev, myAnswers(ev), true)); }); }

    app.appendChild(h('h2', { class: 'tm-h2', text: t('myFamily') }));
    app.appendChild(familyEditor(me));
    focusIfNeeded();
  }

  function memberCard(ev, answers, readOnly) {
    var me = state.me;
    var card = h('div', { class: 'card', id: 'event-' + ev.id },
      h('div', { class: 'card-head' },
        h('div', {}, pill(ev.status), h('h3', { class: 'card-title', text: evTitle(ev) }),
          h('p', { class: 'card-meta', text: fmtDate(ev.event_date) }), metaLine(ev)),
        dateBox(ev)),
      ev.details ? h('p', { class: 'card-text', text: ev.details }) : null,
      rehearsalList(ev));
    if (!readOnly && ['open', 'confirmed'].includes(ev.status) && me.dancers.length) {
      var rows = h('div', { class: 'card-body' });
      me.dancers.forEach(function (d) {
        var cur = answers[d.id] ? answers[d.id].status : null;
        var seg = h('div', { class: 'seg', role: 'group', 'aria-label': t('availabilityFor', { name: d.name }) });
        [['yes', 'btnYes'], ['maybe', 'btnMaybe'], ['no', 'btnNo']].forEach(function (s) {
          seg.appendChild(h('button', { type: 'button', class: cur === s[0] ? 'on-' + s[0] : '', text: t(s[1]),
            onclick: function () { setAvailability(ev, d, cur === s[0] ? null : s[0]); } }));
        });
        rows.appendChild(h('div', { class: 'dancer-row' }, h('span', { class: 'dancer-name', text: d.name }), seg));
      });
      card.appendChild(rows);
    }
    var who = whoChips(ev);
    if (who) card.appendChild(h('div', { class: 'card-body' }, h('b', { text: t('whosIn') }), who));
    return card;
  }

  function setAvailability(ev, dancer, status) {
    api('/api/availability', { method: 'POST', body: { event_id: ev.id, dancer_id: dancer.id, status: status } })
      .then(function () { toast(status ? dancer.name + ': ' + t(status) : t('answerCleared')); return loadEvents(); }).then(render)
      .catch(function (e) { toast(e.message, true); });
  }

  function familyEditor(me) {
    var card = h('div', { class: 'card family-card' });
    var chips = h('div', { class: 'dancers' }, me.dancers.map(function (d) {
      return h('span', { class: 'chip' }, d.name, h('button', { title: t('remove') + ' ' + d.name, text: '✕', onclick: function () {
        if (!confirm(t('removeDancer', { name: d.name }))) return;
        api('/api/dancers?id=' + d.id, { method: 'DELETE' }).then(loadMe).then(refresh).catch(function (e) { toast(e.message, true); });
      } }));
    }));
    var nameIn = h('input', { placeholder: t('addDancerPh'), 'aria-label': t('dancerName') });
    var add = h('form', { class: 'inline-add', onsubmit: function (e) {
      e.preventDefault(); if (!nameIn.value.trim()) return;
      api('/api/dancers', { method: 'POST', body: { name: nameIn.value } }).then(loadMe).then(refresh).catch(function (x) { toast(x.message, true); });
    } }, nameIn, h('button', { class: 'btn btn-sm btn-gold', type: 'submit', text: t('add') }));
    var email = h('input', { type: 'email', value: me.family.email || '', placeholder: 'familia@email.com' });
    var phone = h('input', { type: 'tel', value: me.family.phone || '', placeholder: '(626) 000-0000' });
    var contact = h('form', { class: 'form-grid', style: 'margin-top:0.9rem', onsubmit: function (e) {
      e.preventDefault();
      api('/api/families?id=' + me.family.id, { method: 'PATCH', body: { email: email.value, phone: phone.value } }).then(function () { toast(t('saved')); }).catch(function (x) { toast(x.message, true); });
    } }, h('label', { class: 'f' }, t('emailForNotif'), email), h('label', { class: 'f' }, t('phone'), phone),
      h('div', { class: 'full card-actions' }, h('button', { class: 'btn btn-sm', type: 'submit', text: t('saveContact') })));
    card.appendChild(h('b', { text: t('dancers') })); card.appendChild(chips); card.appendChild(add); card.appendChild(contact);
    return card;
  }

  /* ── admin view ────────────────────────────────────────── */
  var TABS = [['inbox', 'tabInbox'], ['gigs', 'tabGigs'], ['team', 'tabTeam']];
  function renderAdmin() {
    headerRight.innerHTML = '';
    headerRight.appendChild(h('span', {}, h('strong', { text: t('owner') })));
    headerRight.appendChild(h('button', { class: 'btn btn-sm btn-gold', text: t('newGig'), onclick: function () { openEventModal(null); } }));
    headerRight.appendChild(langToggle());
    headerRight.appendChild(h('button', { class: 'btn btn-sm', text: t('signOut'), onclick: signOut }));
    tabsEl.hidden = false; tabsEl.innerHTML = '';
    var inquiries = state.events.filter(function (e) { return e.status === 'inquiry'; });
    if (state.focusEvent) { var f = state.events.find(function (e) { return e.id === state.focusEvent; }); if (f) state.tab = f.status === 'inquiry' ? 'inbox' : 'gigs'; }
    TABS.forEach(function (tb) {
      tabsEl.appendChild(h('button', { class: 'tm-tab' + (state.tab === tb[0] ? ' is-active' : ''), onclick: function () { state.tab = tb[0]; render(); } },
        t(tb[1]), tb[0] === 'inbox' && inquiries.length ? h('span', { class: 'count', text: inquiries.length }) : null));
    });
    app.innerHTML = '';
    var ch = state.me.channels || {};
    app.appendChild(h('div', { class: 'status-bar' },
      h('span', { class: ch.groupme ? 'on' : '', text: (ch.groupme ? '● ' : '○ ') + t(ch.groupme ? 'groupmeOn' : 'groupmeOff') }),
      h('span', { class: ch.email ? 'on' : '', text: (ch.email ? '● ' : '○ ') + t(ch.email ? 'emailOn' : 'emailOff') })));
    if (state.tab === 'inbox') renderInbox(inquiries);
    else if (state.tab === 'gigs') renderGigs();
    else renderTeam();
    focusIfNeeded();
  }

  function renderInbox(inquiries) {
    app.appendChild(h('h2', { class: 'tm-h2', text: t('newInquiries') }));
    app.appendChild(h('p', { class: 'tm-sub', text: t('inboxSub') }));
    if (!inquiries.length) app.appendChild(h('p', { class: 'tm-empty', text: t('inboxClear') }));
    inquiries.forEach(function (ev) { app.appendChild(adminCard(ev)); });
    var archived = state.events.filter(function (e) { return e.status === 'declined' || e.status === 'cancelled'; });
    if (archived.length) {
      app.appendChild(h('h2', { class: 'tm-h2', text: t('archived') }));
      archived.forEach(function (ev) { app.appendChild(adminCard(ev)); });
    }
  }

  function renderGigs() {
    var live = state.events.filter(function (e) { return (e.status === 'open' || e.status === 'confirmed') && !isPast(e); });
    var past = state.events.filter(function (e) { return e.status === 'done' || ((e.status === 'open' || e.status === 'confirmed') && isPast(e)); });
    app.appendChild(h('h2', { class: 'tm-h2', text: t('posted') }));
    app.appendChild(h('p', { class: 'tm-sub', text: t('gigsSub') }));
    if (!live.length) app.appendChild(h('p', { class: 'tm-empty', text: t('nothingPosted') }));
    live.forEach(function (ev) { app.appendChild(adminCard(ev)); });
    if (past.length) { app.appendChild(h('h2', { class: 'tm-h2', text: t('past') })); past.forEach(function (ev) { app.appendChild(adminCard(ev)); }); }
  }

  function adminCard(ev) {
    var card = h('div', { class: 'card', id: 'event-' + ev.id });
    card.appendChild(h('div', { class: 'card-head' },
      h('div', {}, pill(ev.status),
        h('h3', { class: 'card-title' }, h('button', { text: ev.title || t('untitled'), onclick: function () { openEventDetail(ev.id); } })),
        h('p', { class: 'card-meta', text: fmtDate(ev.event_date) + (ev.date_text ? '  ·  “' + ev.date_text + '”' : '') }), metaLine(ev)),
      dateBox(ev)));
    if (ev.status === 'inquiry' || ev.client_name) {
      card.appendChild(h('dl', { class: 'kv' },
        ev.client_name ? [h('dt', { text: t('from') }), h('dd', { text: ev.client_name })] : null,
        ev.client_email ? [h('dt', { text: t('email') }), h('dd', {}, h('a', { href: 'mailto:' + ev.client_email, text: ev.client_email }))] : null,
        ev.client_phone ? [h('dt', { text: t('phone') }), h('dd', {}, h('a', { href: 'tel:' + ev.client_phone.replace(/\D/g, ''), text: ev.client_phone }))] : null,
        ev.event_type ? [h('dt', { text: t('type') }), h('dd', { text: typeLabel(ev.event_type) })] : null,
        [h('dt', { text: t('received') }), h('dd', { text: new Date(ev.created_at).toLocaleString(state.lang === 'es' ? 'es-US' : 'en-US') + (ev.source ? ' ' + t('via') + ' ' + ev.source : '') })]));
      if (ev.message) card.appendChild(h('p', { class: 'card-text', text: ev.message }));
    }
    if (ev.status === 'open' || ev.status === 'confirmed') { card.appendChild(breakdown(ev, null, function (p) { tapCycle(ev, p); })); card.appendChild(h('p', { class: 'hint', text: t('tapHint') })); var al = askedLine(ev); if (al) card.appendChild(al); }
    var actions = h('div', { class: 'card-actions' });
    var hasBot = state.me.channels && state.me.channels.groupme;
    if (ev.status === 'inquiry') {
      if (hasBot) actions.appendChild(h('button', { class: 'btn btn-gold', text: t('askGroup'), onclick: function () { askGroup(ev); } }));
      actions.appendChild(h('button', { class: 'btn' + (hasBot ? '' : ' btn-gold'), text: t('postToTeam'), onclick: function () { openEventModal(ev, 'publish'); } }));
      actions.appendChild(h('button', { class: 'btn', text: t('edit'), onclick: function () { openEventModal(ev); } }));
      actions.appendChild(h('button', { class: 'btn btn-danger', text: t('decline'), onclick: function () { doAction(ev, 'decline'); } }));
    } else if (ev.status === 'open' || ev.status === 'confirmed') {
      actions.appendChild(h('button', { class: 'btn btn-gold', text: t('rosterDetails'), onclick: function () { openEventDetail(ev.id); } }));
      if (hasBot && ev.status === 'open') actions.appendChild(h('button', { class: 'btn', text: ev.asked_at ? t('askAgain') : t('askGroup'), onclick: function () { askGroup(ev); } }));
      if (ev.status === 'confirmed' || ev.status === 'done') actions.appendChild(websiteBtn(ev));
    } else {
      actions.appendChild(h('button', { class: 'btn', text: t('reopen'), onclick: function () { doAction(ev, 'reopen'); } }));
      actions.appendChild(h('button', { class: 'btn btn-danger', text: t('del'), onclick: function () { deleteEvent(ev); } }));
    }
    card.appendChild(actions);
    return card;
  }

  function websiteBtn(ev) {
    return h('button', { class: 'btn' + (ev.website ? ' btn-teal' : ''), text: ev.website ? '✓ ' + t('onWebsite') : t('showOnWebsite'),
      title: ev.website ? t('hideFromWebsite') : t('showOnWebsite'), onclick: function () {
        api('/api/events/' + ev.id, { method: 'PATCH', body: { website: !ev.website } })
          .then(function () { toast(ev.website ? t('websiteOff') : t('websiteOn')); return refresh(); }).catch(function (e) { toast(e.message, true); });
      } });
  }
  function doAction(ev, action, extra) {
    var body = Object.assign({ action: action }, extra || {});
    return api('/api/events/' + ev.id, { method: 'PATCH', body: body }).then(function (d) {
      var n = d.notified;
      if (n && (n.groupme || n.email)) toast(t('donePosted', { ch: [n.groupme ? t('groupme') : null, n.email ? t('emailCh') : null].filter(Boolean).join(t('and')) }));
      else toast(t('done'));
      return d;
    }).then(function (d) { return refresh().then(function () { return d; }); }).catch(function (e) { toast(e.message, true); });
  }
  function deleteEvent(ev) {
    if (!confirm(t('deleteConfirm', { title: ev.title || t('thisEvent') }))) return;
    api('/api/events/' + ev.id, { method: 'DELETE' }).then(refresh).catch(function (e) { toast(e.message, true); });
  }

  /* ── event modal (create / edit / publish) ─────────────── */
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
  function modal(title, body) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '';
    var box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, h('h2', { text: title }), body);
    root.appendChild(h('div', { class: 'modal-back', onclick: function (e) { if (e.target === e.currentTarget) closeModal(); } }, box));
    var first = box.querySelector('input, select, textarea, button'); if (first) first.focus();
    return box;
  }

  function field(label, input, full) { return h('label', { class: 'f' + (full ? ' full' : '') }, label, input); }
  function inp(name, ev, attrs) { return h('input', Object.assign({ name: name, value: ev && ev[name] != null ? ev[name] : '' }, attrs || {})); }

  function openEventModal(ev, intent) {
    ev = ev || {};
    var isNew = !ev.id;
    var types = t('types');
    var typeSel = h('select', { name: 'event_type' }, h('option', { value: '', text: t('typePh') }), Object.keys(types).map(function (k) {
      return h('option', { value: k, text: types[k], selected: ev.event_type === k });
    }));
    var rehearsals = (ev.rehearsals || []).slice();
    var rehBox = h('div', { class: 'full' });
    function renderReh() {
      rehBox.innerHTML = '';
      rehBox.appendChild(h('b', { text: t('rehearsalsLabel') }));
      rehearsals.forEach(function (r, i) {
        rehBox.appendChild(h('div', { class: 'form-grid', style: 'margin:0.4rem 0;grid-template-columns:1fr 1fr 1.4fr auto;gap:0.4rem' },
          h('input', { type: 'date', value: r.date || '', 'aria-label': t('rehearsalDate'), oninput: function (e) { r.date = e.target.value; } }),
          h('input', { placeholder: t('time'), value: r.time || '', oninput: function (e) { r.time = e.target.value; } }),
          h('input', { placeholder: t('locationNote'), value: r.location || '', oninput: function (e) { r.location = e.target.value; } }),
          h('button', { type: 'button', class: 'btn btn-sm btn-danger', text: '✕', onclick: function () { rehearsals.splice(i, 1); renderReh(); } })));
      });
      rehBox.appendChild(h('button', { type: 'button', class: 'btn btn-sm', text: t('addRehearsal'), onclick: function () { rehearsals.push({}); renderReh(); } }));
    }
    renderReh();
    var notify = h('input', { type: 'checkbox', checked: true });
    var err = h('p', { class: 'error' });
    var form = h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      var fd = new FormData(form); var body = {};
      fd.forEach(function (v, k) { body[k] = v; });
      body.rehearsals = rehearsals.filter(function (r) { return r.date || r.time || r.location; });
      if (!body.title) { err.textContent = t('needTitle'); return; }
      var p;
      if (isNew) {
        body.status = intent === 'publish' ? 'open' : 'inquiry';
        p = api('/api/events', { method: 'POST', body: body }).then(function (d) {
          if (intent === 'publish') return api('/api/events/' + d.id, { method: 'PATCH', body: { action: 'publish', notify: notify.checked } });
        });
      } else {
        if (intent === 'publish') { body.action = 'publish'; body.notify = notify.checked; }
        p = api('/api/events/' + ev.id, { method: 'PATCH', body: body });
      }
      p.then(function (d) {
        closeModal();
        if (intent === 'publish') {
          var n = d && d.notified;
          toast(n && n.groupme ? t('postedGroupme') : t('postedCopy'));
          state.tab = 'gigs';
        } else toast(t('saved'));
        return refresh();
      }).catch(function (x) { err.textContent = x.message; });
    } },
      field(t('title'), inp('title', ev, { placeholder: t('titlePh'), required: true }), true),
      field(t('typeLabel'), typeSel),
      field(t('dateLabel'), inp('event_date', ev, { type: 'date' })),
      field(t('startTime'), inp('start_time', ev, { placeholder: '7:00 PM' })),
      field(t('endTime'), inp('end_time', ev, { placeholder: '7:30 PM' })),
      field(t('callTime'), inp('call_time', ev, { placeholder: '6:15 PM' })),
      field(t('dancersNeededLabel'), inp('dancers_needed', ev, { type: 'number', min: 0 })),
      field(t('venue'), inp('venue', ev, { placeholder: 'Grand Ballroom' })),
      field(t('city'), inp('city', ev, { placeholder: 'West Covina' })),
      field(t('address'), inp('address', ev, {}), true),
      field(t('payLabel'), inp('pay', ev, { placeholder: t('payPh') })),
      ev.date_text ? field(t('clientWrote'), h('input', { value: ev.date_text, disabled: true })) : null,
      field(t('detailsForTeam'), h('textarea', { name: 'details', text: ev.details || '', placeholder: t('detailsPh') }), true),
      rehBox,
      h('details', { class: 'full' }, h('summary', { style: 'cursor:pointer;color:var(--muted);font-size:0.85rem' }, t('clientSection')),
        h('div', { class: 'form-grid', style: 'margin-top:0.6rem' },
          field(t('clientName'), inp('client_name', ev)), field(t('clientEmail'), inp('client_email', ev, { type: 'email' })), field(t('clientPhone'), inp('client_phone', ev, { type: 'tel' })),
          field(t('clientMessage'), h('textarea', { name: 'message', text: ev.message || '' }), true),
          field(t('privateNotes'), h('textarea', { name: 'notes', text: ev.notes || '' }), true))),
      intent === 'publish' ? h('label', { class: 'check full' }, notify, t('notifyNow')) : null,
      h('div', { class: 'full card-actions' },
        h('button', { class: 'btn btn-gold', type: 'submit', text: intent === 'publish' ? t('modalPost') : isNew ? t('create') : t('save') }),
        h('button', { class: 'btn', type: 'button', text: t('cancel'), onclick: closeModal })),
      h('div', { class: 'full' }, err));
    modal(intent === 'publish' ? t('modalPost') : isNew ? t('modalNew') : t('modalEdit'), form);
  }

  /* ── event detail (roster) ─────────────────────────────── */
  function eventLines(ev) {
    var lines = [evTitle(ev) + ' — ' + fmtDate(ev.event_date)];
    if (fmtTime(ev)) lines.push(t('annTime') + ': ' + fmtTime(ev));
    if (ev.call_time) lines.push(t('callTime') + ': ' + ev.call_time);
    var where = [ev.venue, ev.address, ev.city].filter(Boolean).join(', '); if (where) lines.push(t('annWhere') + ': ' + where);
    if (ev.dancers_needed) lines.push(t('annDancers') + ': ' + ev.dancers_needed);
    if (ev.details) lines.push(ev.details);
    return lines;
  }
  function eventLink(ev) { return location.origin + '/team/#event-' + ev.id; }
  function announcementText(ev) {
    return [t('annHead')].concat(eventLines(ev), ['', t('annLink') + ': ' + eventLink(ev)]).join('\n');
  }
  function confirmationText(ev, roster) {
    var names = []; roster.forEach(function (f) { f.dancers.forEach(function (d) { if (d.status === 'yes') names.push(d.name); }); });
    var lines = [t('confHead') + ': ' + eventLines(ev)[0]].concat(eventLines(ev).slice(1));
    if (names.length) lines.push('', t('confDancers') + ': ' + names.join(', '));
    if ((ev.rehearsals || []).length) { lines.push('', t('rehearsals') + ':'); ev.rehearsals.forEach(function (r) { lines.push('• ' + rehearsalLine(r)); }); }
    lines.push('', t('confDetails') + ': ' + eventLink(ev));
    return lines.join('\n');
  }
  function reminderText(ev, roster) {
    var missing = []; roster.forEach(function (f) { f.dancers.forEach(function (d) { if (!d.status) missing.push(d.name); }); });
    var head = t('remHead', { title: evTitle(ev), date: fmtDate(ev.event_date) });
    return missing.length ? head + ' ' + t('remMissing', { names: missing.join(', ') }) + '\n' + eventLink(ev) : head + ' ' + t('remAll');
  }

  function openEventDetail(id) {
    api('/api/events/' + id).then(function (d) {
      var ev = d.event, roster = d.roster || [];
      var body = h('div', {});
      body.appendChild(h('div', { class: 'card-head' },
        h('div', {}, pill(ev.status), h('p', { class: 'card-meta', text: fmtDate(ev.event_date) }), metaLine(ev)), dateBox(ev)));
      if (ev.details) body.appendChild(h('p', { class: 'card-text', text: ev.details }));
      var reh = rehearsalList(ev); if (reh) body.appendChild(reh);
      body.appendChild(breakdown(ev, roster));
      var rosterBox = h('div', { class: 'card-body' }, h('b', { text: t('rosterByFamily') }));
      roster.forEach(function (f) {
        rosterBox.appendChild(h('div', { class: 'dancer-row' },
          h('span', {}, h('span', { class: 'dancer-name', text: f.name }), f.phone ? h('span', { class: 'hint', text: ' ' + f.phone }) : null),
          h('span', { class: 'who', style: 'margin:0' }, f.dancers.map(function (dn) {
            return h('span', { class: 'chip ' + (dn.status || 'pending'), text: dn.name + (dn.status ? '' : ' ?'), title: t('tapToChange'), style: 'cursor:pointer',
              onclick: function () { cycleAdminAvailability(ev, dn, id); } });
          }))));
      });
      body.appendChild(rosterBox);
      body.appendChild(h('p', { class: 'hint', text: t('tapHint') }));
      var al = askedLine(ev); if (al) body.appendChild(al);
      var actions = h('div', { class: 'card-actions' });
      var hasBot = state.me.channels && state.me.channels.groupme;
      function reminderBtn() {
        return h('button', { class: 'btn', text: hasBot ? t('sendReminder') : t('copyReminder'), onclick: function () {
          if (hasBot) doAction(ev, 'remind').then(closeModal); else copyText(reminderText(ev, roster));
        } });
      }
      function cancelBtn() { return h('button', { class: 'btn btn-danger', text: t('cancelGig'), onclick: function () { if (confirm(t('cancelAsk'))) doAction(ev, 'cancel').then(closeModal); } }); }
      actions.appendChild(h('button', { class: 'btn', text: t('editDetails'), onclick: function () { closeModal(); openEventModal(ev); } }));
      if (ev.status === 'open') {
        actions.appendChild(h('button', { class: 'btn', text: t('copyAnnouncement'), onclick: function () { copyText(announcementText(ev)); } }));
        if (hasBot) {
          actions.appendChild(h('button', { class: 'btn', text: ev.asked_at ? t('askAgain') : t('askGroup'), onclick: function () { askGroup(ev, closeModal); } }));
          actions.appendChild(h('button', { class: 'btn', text: t('postTally'), onclick: function () { doAction(ev, 'tally').then(closeModal); } }));
        }
        actions.appendChild(reminderBtn());
        actions.appendChild(h('button', { class: 'btn btn-teal', text: t('confirmGig'), onclick: function () {
          if (!confirm(t('confirmAsk'))) return;
          doAction(ev, 'confirm').then(function () { openEventDetail(id); });
        } }));
        actions.appendChild(cancelBtn());
      } else if (ev.status === 'confirmed') {
        actions.appendChild(h('button', { class: 'btn', text: t('copyConfirmation'), onclick: function () { copyText(confirmationText(ev, roster)); } }));
        actions.appendChild(reminderBtn());
        actions.appendChild(h('button', { class: 'btn btn-teal', text: t('markDone'), onclick: function () { doAction(ev, 'done').then(closeModal); } }));
        actions.appendChild(h('button', { class: 'btn', text: ev.website ? t('hideFromWebsite') : t('showOnWebsite'), onclick: function () {
          api('/api/events/' + id, { method: 'PATCH', body: { website: !ev.website } }).then(function () { toast(ev.website ? t('websiteOff') : t('websiteOn')); return refresh(); }).then(function () { openEventDetail(id); }).catch(function (e) { toast(e.message, true); });
        } }));
        actions.appendChild(cancelBtn());
      } else {
        actions.appendChild(h('button', { class: 'btn', text: t('postToTeam'), onclick: function () { closeModal(); openEventModal(ev, 'publish'); } }));
        actions.appendChild(h('button', { class: 'btn btn-danger', text: t('del'), onclick: function () { closeModal(); deleteEvent(ev); } }));
      }
      actions.appendChild(h('button', { class: 'btn', text: t('close'), onclick: closeModal }));
      body.appendChild(actions);
      modal(ev.title || t('gig'), body);
    }).catch(function (e) { toast(e.message, true); });
  }
  function cycleAdminAvailability(ev, dn, id) {
    var next = { yes: 'maybe', maybe: 'no', no: null }; var s = dn.status ? next[dn.status] : 'yes';
    api('/api/availability', { method: 'POST', body: { event_id: ev.id, dancer_id: dn.id, status: s } })
      .then(function () { return loadEvents(); }).then(function () { openEventDetail(id); }).catch(function (e) { toast(e.message, true); });
  }

  /* ── team (families) ───────────────────────────────────── */
  function renderTeam() {
    app.appendChild(h('h2', { class: 'tm-h2', text: t('familiesTitle') }));
    app.appendChild(h('p', { class: 'tm-sub', text: t('familiesSub') }));
    var name = h('input', { placeholder: t('familyNamePh'), required: true });
    var email = h('input', { type: 'email', placeholder: t('emailOpt') });
    var phone = h('input', { type: 'tel', placeholder: t('phoneOpt') });
    var dancers = h('input', { placeholder: t('dancersPh') });
    app.appendChild(h('form', { class: 'card form-grid', onsubmit: function (e) {
      e.preventDefault();
      api('/api/families', { method: 'POST', body: { name: name.value, email: email.value, phone: phone.value, dancers: dancers.value } })
        .then(function () { toast(t('familyAdded')); return refresh(); }).catch(function (x) { toast(x.message, true); });
    } },
      field(t('newFamily'), name), field(t('email'), email), field(t('phone'), phone), field(t('dancers'), dancers, true),
      h('div', { class: 'full card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('addFamily') }))));
    if (!state.families.length) app.appendChild(h('p', { class: 'tm-empty', text: t('noFamilies') }));
    state.families.forEach(function (f) {
      var card = h('div', { class: 'card family-card' });
      card.appendChild(h('div', { class: 'card-head' }, h('div', {}, h('h3', { class: 'card-title', text: f.name }),
        h('p', { class: 'card-meta', text: [f.email, f.phone, f.groupme_user_id ? t('botLinked') : null].filter(Boolean).join(' · ') || t('noContact') }))));
      card.appendChild(h('div', { class: 'dancers' }, f.dancers.map(function (d) {
        return h('span', { class: 'chip', style: d.active ? '' : 'opacity:0.4' }, d.name, h('button', { text: '✕', title: t('remove'), onclick: function () {
          if (confirm(t('removeAsk', { name: d.name }))) api('/api/dancers?id=' + d.id, { method: 'DELETE' }).then(refresh);
        } }));
      })));
      var dn = h('input', { placeholder: t('addDancer') });
      card.appendChild(h('form', { class: 'inline-add', onsubmit: function (e) {
        e.preventDefault(); if (!dn.value.trim()) return;
        api('/api/dancers', { method: 'POST', body: { family_id: f.id, name: dn.value } }).then(refresh).catch(function (x) { toast(x.message, true); });
      } }, dn, h('button', { class: 'btn btn-sm', type: 'submit', text: t('add') })));
      card.appendChild(h('div', { class: 'card-actions' },
        h('button', { class: 'btn btn-sm btn-gold', text: t('copyInvite'), onclick: function () { copyText(f.invite_link); } }),
        h('button', { class: 'btn btn-sm', text: t('newLink'), title: t('newLinkTitle'), onclick: function () {
          if (!confirm(t('newLinkAsk', { name: f.name }))) return;
          api('/api/families?id=' + f.id, { method: 'PATCH', body: { action: 'rotate' } }).then(function (d) { copyText(d.invite_link); return refresh(); });
        } }),
        h('button', { class: 'btn btn-sm btn-danger', text: t('removeFamily'), onclick: function () {
          if (confirm(t('removeFamilyAsk', { name: f.name }))) api('/api/families?id=' + f.id, { method: 'DELETE' }).then(refresh);
        } })));
      app.appendChild(card);
    });
    renderBotLog();
  }

  var MARK = { yes: '✓', maybe: '?', no: '✗' };
  function botResultText(m) {
    var r = m.result || {};
    if (m.applied) {
      var byEv = {}; var order = [];
      (r.updates || []).forEach(function (u) {
        var k = u.event_date || u.event_title || u.event_id;
        if (!byEv[k]) { byEv[k] = []; order.push(k); }
        byEv[k].push(u.dancer_name.split(' ')[0] + ' ' + MARK[u.status]);
      });
      order.sort();
      return order.map(function (k) { return (/^\d{4}-/.test(k) ? fmtDate(k) : k) + ': ' + byEv[k].join(' · '); }).join('  ·  ') + (r.event_guessed ? ' ' + t('botGuessed') : '');
    }
    var why = { 'no-intent': t('botIgnored'), 'no-dancers': t('botNoDancers'), 'unknown-sender': t('botUnknownSender'), 'no-open-event': t('botNoEvent'), 'no-event-for-date': t('botNoDate'), 'too-vague': t('botVague') }[r.reason] || t('botIgnored');
    if (r.ambiguous && r.ambiguous.length) why += ' — ' + t('botAmbiguous', { names: r.ambiguous.join(', ') });
    return why;
  }
  function renderBotLog() {
    var listening = state.me.channels && state.me.channels.groupme_listen;
    app.appendChild(h('h2', { class: 'tm-h2', text: t('botTitle') }));
    app.appendChild(h('p', { class: 'tm-sub', text: listening ? t('botSubOn') : t('botSubOff') }));
    if (!listening) return;
    var box = h('div', { class: 'card bot-log' });
    app.appendChild(box);
    function fill() {
      box.innerHTML = '';
      if (!state.botLog || !state.botLog.length) { box.appendChild(h('p', { class: 'hint', text: t('botEmpty') })); return; }
      state.botLog.forEach(function (m) {
        var r = m.result || {};
        var row = h('div', { class: 'bot-row' + (m.applied ? ' applied' : '') },
          h('div', { class: 'bot-msg' }, h('strong', { text: m.sender_name || '?' }), document.createTextNode(': ' + m.text)),
          h('div', { class: 'bot-res', text: botResultText(m) }));
        if (!m.applied && r.intent && m.user_id) {
          var known = state.families.some(function (f) { return f.groupme_user_id === m.user_id; });
          row.appendChild(h('div', { class: 'card-actions', style: 'margin-top:0.4rem' },
            !known ? h('button', { class: 'btn btn-sm btn-gold', text: t('addFamilyFrom'), onclick: function () { addFamilyFromGroupMe(m); } }) : null,
            h('button', { class: 'btn btn-sm', text: t('reread'), onclick: function () { rereadMessage(m); } })));
        }
        box.appendChild(row);
      });
    }
    if (state.botLog === null) loadBotLog().then(fill); else fill();
  }

  // Group display names look like "Folk-Maricela Orozco (Ashley Emily & Sharlene)".
  function guessFamily(display) {
    var d = String(display || '').replace(/^folk-?\s*/i, '').replace(/-\s*\S+\s+mom$/i, '');
    var m = d.match(/^(.*?)\s*\((.*)\)\s*$/);
    var who = m ? m[1].trim() : d.trim();
    var kids = [];
    if (m) {
      m[2].replace(/['’]s\s+mom|\bmom\b|\bdad\b|\badult\b/ig, '').split(/\s*(?:&|,|\/|\band\b|\by\b)\s*/).forEach(function (seg) {
        seg.trim().split(/\s+/).forEach(function (w) { if (w) kids.push(w); });   // names inside ( ) are first names
      });
    }
    var parts = who.split(/\s+/);
    var surname = parts.length > 1 ? parts[parts.length - 1] : '';
    if (!kids.length) return { name: surname || who, dancers: who };
    return { name: surname || who, dancers: kids.map(function (k) { return surname ? k + ' ' + surname : k; }).join(', ') };
  }
  function addFamilyFromGroupMe(m) {
    var g = guessFamily(m.sender_name);
    var name = h('input', { value: g.name, required: true });
    var dancers = h('input', { value: g.dancers });
    var form = h('form', { class: 'form-grid', onsubmit: function (e) {
      e.preventDefault();
      api('/api/families', { method: 'POST', body: { name: name.value, dancers: dancers.value, groupme_user_id: m.user_id } })
        .then(function () { toast(t('familyAdded')); closeModal(); return loadFamilies(); })
        .then(function () { return api('/api/groupme', { method: 'POST', body: { id: m.id } }); })
        .then(function () { return loadBotLog(); }).then(function () { return loadEvents(); }).then(render)
        .catch(function (x) { toast(x.message, true); });
    } },
      h('p', { class: 'hint', text: t('addFamilyHint', { name: m.sender_name }) }),
      field(t('newFamily'), name), field(t('dancers'), dancers, true),
      h('div', { class: 'full card-actions' }, h('button', { class: 'btn btn-gold', type: 'submit', text: t('addFamily') }), h('button', { class: 'btn', type: 'button', text: t('close'), onclick: closeModal })));
    modal(t('addFamilyFrom'), form);
  }
  function rereadMessage(m) {
    api('/api/groupme', { method: 'POST', body: { id: m.id } }).then(function (d) {
      toast(d.applied ? t('done') : botResultText({ result: d }));
      return loadBotLog().then(loadEvents).then(render);
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ── render dispatch ───────────────────────────────────── */
  function render() {
    if (!state.me || state.me.role === 'anon') return renderLogin();
    if (state.me.role === 'admin') renderAdmin(); else renderMember();
  }
  function focusIfNeeded() {
    if (!state.focusEvent) return;
    var el = document.getElementById('event-' + state.focusEvent);
    state.focusEvent = null;
    if (el) { el.classList.add('is-flash'); setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); }
  }

  boot();
})();
