const SEASON_MONTHS = { fall: [9, 10, 11], winter: [12, 1, 2], spring: [3, 4, 5], summer: [6, 7, 8] };

export function seasonOf(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!m) return null;
  const month = parseInt(m[2], 10);
  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (months.includes(month)) return season;
  }
  return null;
}

const SEASON_LABEL = {
  fall: { en: 'Fall', es: 'Otoño' },
  winter: { en: 'Winter', es: 'Invierno' },
  spring: { en: 'Spring', es: 'Primavera' },
  summer: { en: 'Summer', es: 'Verano' },
};

function earliestDate(events) {
  let earliest = null;
  for (const ev of events || []) {
    if (!ev.event_date) continue;
    if (!earliest || ev.event_date < earliest) earliest = ev.event_date;
  }
  return earliest;
}

export function sheetTitle(events, lang) {
  const es = lang === 'es';
  const date = earliestDate(events);
  if (!date) return es ? 'Lista de eventos' : 'Gig Roster';
  const season = seasonOf(date);
  const year = date.slice(0, 4);
  const label = SEASON_LABEL[season][es ? 'es' : 'en'];
  return es ? `Lista de eventos · ${label} ${year}` : `${label} ${year} Gig Roster`;
}

function dateHeader(dateStr, lang) {
  if (!dateStr) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!m) return '';
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, 12));
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function columnHeader(ev, lang) {
  const es = lang === 'es';
  const date = dateHeader(ev.event_date, lang);
  const title = ev.title || '';
  const plain = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  const inTitle = (v) => { const p = plain(v); return p.length >= 3 && (' ' + plain(title) + ' ').includes(' ' + p + ' '); };
  const parts = [ev.venue, ev.city].filter((v) => v && !inTitle(v));
  const place = parts.join(', ') || (ev.venue || ev.city ? '' : String(ev.address || '').trim());
  const show = ev.start_time ? ev.start_time + (ev.end_time ? `–${ev.end_time}` : '') : '';
  const call = ev.call_time ? `${es ? 'Llamado' : 'Call time'}: ${ev.call_time}` : '';
  const time = show ? `${es ? 'Función' : 'Performance'}: ${show}` : '';
  return { date, title, place, call, time };
}

const CELL_TEXT = {
  yes: { en: 'Yes', es: 'Sí' },
  no: { en: 'No', es: 'No' },
  maybe: { en: 'Maybe', es: 'Quizás' },
};

export function cellText(status, lang) {
  const entry = CELL_TEXT[status];
  if (!entry) return '';
  return entry[lang === 'es' ? 'es' : 'en'];
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

export function renderSheet({ events, dancers, availability, lang = 'en', printedAt = new Date() }) {
  const es = lang === 'es';
  const title = sheetTitle(events, lang);

  const answerByKey = new Map();
  for (const a of availability || []) {
    answerByKey.set(`${a.event_id}:${a.dancer_id}`, a.status);
  }

  const headCells = events
    .map((ev) => {
      const h = columnHeader(ev, lang);
      const parts = [];
      if (h.date) parts.push(`<div class="date">${esc(h.date)}</div>`);
      if (h.title) parts.push(`<div class="title">${esc(h.title)}</div>`);
      if (h.place) parts.push(`<div class="place">${esc(h.place)}</div>`);
      if (h.call) parts.push(`<div class="time">${esc(h.call)}</div>`);
      if (h.time) parts.push(`<div class="time">${esc(h.time)}</div>`);
      return `<th class="gig">${parts.join('')}</th>`;
    })
    .join('');

  const firstCounts = new Map();
  for (const d of dancers) { const k = firstName(d.name).toLowerCase(); firstCounts.set(k, (firstCounts.get(k) || 0) + 1); }
  const label = (d) => {
    const first = firstName(d.name);
    if (firstCounts.get(first.toLowerCase()) < 2) return first;
    const rest = String(d.name || '').trim().split(/\s+/).slice(1).join(' ') || String(d.family || '').trim();
    return rest ? `${first} ${rest[0].toUpperCase()}.` : first;
  };
  const bodyRows = dancers
    .map((d, i) => {
      const cells = events
        .map((ev) => {
          const status = answerByKey.get(`${ev.id}:${d.id}`);
          const cls = status === 'yes' ? 'c-yes' : status === 'no' ? 'c-no' : status === 'maybe' ? 'c-maybe' : 'c-none';
          return `<td class="${cls}">${esc(cellText(status, lang))}</td>`;
        })
        .join('');
      return `<tr><td class="name"><span class="n">${i + 1}.</span> ${esc(label(d))}</td>${cells}</tr>`;
    })
    .join('');


  const footCells = events
    .map((ev) => {
      const count = dancers.filter((d) => answerByKey.get(`${ev.id}:${d.id}`) === 'yes').length;
      const suffix = ev.dancers_needed ? `<span class="of"> / ${ev.dancers_needed}</span>` : '';
      return `<td>${count}${suffix}</td>`;
    })
    .join('');

  const printedDate = new Intl.DateTimeFormat(es ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(printedAt);

  const meta = es ? `Impreso ${printedDate}` : `Printed ${printedDate}`;
  const legend = es
    ? 'En blanco = sin respuesta · Van = confirmados / necesarios'
    : 'Blank = no answer yet · Going = confirmed / needed';
  const printLabel = es ? 'Imprimir o guardar PDF' : 'Print or save as PDF';
  const hint = es
    ? 'Con más de cuatro eventos, imprime en horizontal.'
    : 'With more than four gigs, print in landscape.';
  const nameHeader = es ? 'Bailarín' : 'Dancer';
  const goingLabel = es ? 'Van' : 'Going';

  return `<!doctype html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page { margin: 0.5in }
* { box-sizing: border-box }
html, body { height: 100% }
body { font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; color: #1a1024; background: #fff; margin: 0; display: flex; flex-direction: column; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.bar { background: #1e1230; color: #fff; padding: 14px 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px }
.bar button { font: inherit; font-weight: 700; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: #1e1230;
  background: linear-gradient(135deg, #e8c97a, #c9a84c); border: 0; border-radius: 12px; padding: 12px 20px; cursor: pointer; min-height: 48px }
.bar p { margin: 0; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.8); max-width: 60ch }
.page { padding: 18px 18px 16px; max-width: 11in; margin: 0 auto; width: 100%; flex: 1 }
.mast { display: flex; align-items: center; gap: 14px }
.flourish { width: 100%; height: 3px; margin: 12px 0 8px; background: #c9a84c }
.mast img { height: 54px; width: auto; flex: none }
.mast .who { flex: 1; min-width: 0 }
.mast .wm { font-size: 9pt; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #1e1230; line-height: 1.25 }
.mast .wm .mh { display: block; font-size: 12.5pt; font-weight: 800; letter-spacing: 0.1em; color: #1e1230 }
.mast .meta { font-size: 8pt; color: #6b6470; text-align: right; white-space: nowrap }
h1 { font-size: 16pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1e1230; margin: 4px 0 10px; line-height: 1.15 }
table { border-collapse: collapse; width: 100%; table-layout: fixed }
col.name { width: 2in }
th, td { border: 1px solid #c4bccb; padding: 4px 6px; vertical-align: top; overflow-wrap: anywhere }
thead th { background: #efe9f5; text-align: left; font-size: 8.5pt; line-height: 1.3; border-bottom: 2px solid #1e1230 }
thead th.name { vertical-align: bottom; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #6b4a8a }
thead th .date { font-weight: 800; font-size: 9.5pt; color: #1e1230 }
thead th .title { font-weight: 600; color: #1a1024 }
thead th .place, thead th .time { color: #55506a; font-weight: 500 }
tbody tr { page-break-inside: avoid }
tbody td { height: 25px }
tbody tr:nth-child(even) td { background: #faf8fc }
td.name { white-space: nowrap; font-weight: 600; overflow: hidden; text-overflow: ellipsis }
td.name .n { display: inline-block; min-width: 1.7em; color: #9a93a3; font-weight: 500; font-variant-numeric: tabular-nums }
tbody td:not(.name), tfoot td:not(:first-child) { text-align: center }
.c-yes { font-weight: 700; color: #1e1230 }
.c-no { color: #8f8898 }
.c-maybe { font-style: italic; color: #55506a }
tfoot td { background: #efe9f5; font-weight: 800; color: #1e1230; border-top: 2px solid #1e1230 }
tfoot td:first-child { text-transform: uppercase; letter-spacing: 0.14em; font-size: 7.5pt; color: #6b4a8a; vertical-align: middle }
tfoot .of { font-weight: 500; color: #6b6470 }
.legend { margin: 8px 0 0; font-size: 7.5pt; color: #6b6470; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap }
@media print { html, body { height: auto; display: block } .bar { display: none } .page { padding: 0.35in 0.4in; max-width: none; width: auto } }
@media print and (orientation: portrait) {
  body { font-size: 10.5pt }
  .page { padding: 0.3in 0.25in }
  col.name { width: 1.45in }
  thead th { font-size: 8.5pt }
  thead th .date { font-size: 10pt }
  tbody td { height: 29px }
  td.name .n { min-width: 1.9em }
}
@media screen and (max-width: 640px) {
  .page { padding: 12px }
  .mast .meta { display: none }
  .bar p { display: none }
  .bar button { width: 100% }
  .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch }
  table { min-width: calc(120px + ${events.length} * 170px) }
  col.name { width: 120px }
  th.name, td.name { position: sticky; left: 0; z-index: 1; background: #fff; box-shadow: 1px 0 0 #c4bccb, inset 0 -1px 0 #c4bccb }
  thead th.name, tfoot td.name { background: #efe9f5 }
  tbody tr:nth-child(even) td.name { background: #faf8fc }
}
</style>
</head>
<body>
<div class="bar">
<button onclick="window.print()">${esc(printLabel)}</button>
<p>${esc(hint)}</p>
</div>
<div class="page">
<div class="mast">
<img src="/images/optimized/logo-dancers-color.webp" alt="">
<div class="who"><div class="wm">Ballet Folklórico<span class="mh">Mi Herencia</span></div></div>
<div class="meta">${esc(meta)}</div>
</div>
<div class="flourish" aria-hidden="true"></div>
<h1>${esc(title)}</h1>
<div class="scroll">
<table>
<colgroup><col class="name">${events.map(() => '<col>').join('')}</colgroup>
<thead>
<tr><th class="name">${esc(nameHeader)}</th>${headCells}</tr>
</thead>
<tbody>
${bodyRows}
</tbody>
<tfoot>
<tr><td class="name">${esc(goingLabel)}</td>${footCells}</tr>
</tfoot>
</table>
</div>
<p class="legend"><span>${esc(legend)}</span><span>bfmh.dance/team</span></p>
</div>
</body>
</html>`;
}
