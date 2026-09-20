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
  fall: { en: 'FALL', es: 'OTOÑO' },
  winter: { en: 'WINTER', es: 'INVIERNO' },
  spring: { en: 'SPRING', es: 'PRIMAVERA' },
  summer: { en: 'SUMMER', es: 'VERANO' },
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
  if (!date) return es ? 'CALENDARIO DE PRESENTACIONES' : 'PERFORMANCE SCHEDULE';
  const season = seasonOf(date);
  const year = date.slice(0, 4);
  const label = SEASON_LABEL[season][es ? 'es' : 'en'];
  return es ? `CALENDARIO DE PRESENTACIONES · ${label} ${year}` : `${label} ${year} PERFORMANCE SCHEDULE`;
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
  const place = [ev.venue, ev.city].filter(Boolean).join(', ');
  let time = '';
  if (ev.start_time) {
    time = (es ? 'Hora: ' : 'Time: ') + ev.start_time + (ev.end_time ? `–${ev.end_time}` : '');
  }
  return { date, title, place, time };
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

export function renderSheet({ events, dancers, availability, lang = 'en', printedAt = new Date() }) {
  const es = lang === 'es';
  const title = sheetTitle(events, lang);
  const landscape = events.length > 4;

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
      if (h.time) parts.push(`<div class="time">${esc(h.time)}</div>`);
      return `<th>${parts.join('')}</th>`;
    })
    .join('');

  const bodyRows = dancers
    .map((d, i) => {
      const cells = events
        .map((ev) => {
          const status = answerByKey.get(`${ev.id}:${d.id}`);
          const cls = status === 'yes' ? 'c-yes' : status === 'no' ? 'c-no' : status === 'maybe' ? 'c-maybe' : 'c-none';
          return `<td class="${cls}">${esc(cellText(status, lang))}</td>`;
        })
        .join('');
      return `<tr><td class="name">${i + 1}. ${esc(d.name)}</td>${cells}</tr>`;
    })
    .join('');

  const blankRow = `<tr><td class="name"></td>${events.map(() => '<td></td>').join('')}</tr>`;
  const blankRows = blankRow + blankRow;

  const footCells = events
    .map((ev) => {
      const count = dancers.filter((d) => answerByKey.get(`${ev.id}:${d.id}`) === 'yes').length;
      const suffix = ev.dancers_needed ? ` / ${ev.dancers_needed}` : '';
      return `<td>${count}${suffix}</td>`;
    })
    .join('');

  const printedDate = new Intl.DateTimeFormat(es ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(printedAt);

  const footer = es
    ? `Impreso ${printedDate} · ${dancers.length} bailarines · En blanco = sin respuesta · Ballet Folklórico Mi Herencia`
    : `Printed ${printedDate} · ${dancers.length} dancers · Blank = no answer yet · Ballet Folklórico Mi Herencia`;

  const printLabel = es ? 'Imprimir / Guardar PDF' : 'Print / Save as PDF';
  const hint = es
    ? 'En el teléfono: toca Compartir y luego Imprimir o Guardar en Archivos. O envía este enlace a una computadora y ábrelo allí.'
    : 'On a phone: tap Share, then Print or Save to Files. Or send this link to a computer and open it there.';
  const nameHeader = es ? 'Nombre' : 'Dancer Name';
  const goingLabel = es ? 'Van' : 'Going';

  return `<!doctype html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
@page { size: letter ${landscape ? 'landscape' : 'portrait'}; margin: 0.5in }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; margin: 0; padding: 16px }
h1 { font-size: 16pt }
table { border-collapse: collapse; width: 100% }
th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top }
th { text-align: left }
td.name, th.name { white-space: nowrap }
tbody td:not(.name), tfoot td:not(:first-child) { text-align: center }
tr { height: 22px; page-break-inside: avoid }
thead { display: table-header-group }
th div.date { font-weight: 700 }
.c-no { color: #555 }
.bar { background: #eee; padding: 12px }
.bar button { font-size: 16px; padding: 10px 18px }
.foot { margin-top: 8px }
@media print { .bar { display: none } }
</style>
</head>
<body>
<div class="bar">
<button onclick="window.print()">${esc(printLabel)}</button>
<p>${esc(hint)}</p>
</div>
<h1>${esc(title)}</h1>
<table>
<thead>
<tr><th class="name">${esc(nameHeader)}</th>${headCells}</tr>
</thead>
<tbody>
${bodyRows}
${blankRows}
</tbody>
<tfoot>
<tr><td>${esc(goingLabel)}</td>${footCells}</tr>
</tfoot>
</table>
<p class="foot">${esc(footer)}</p>
</body>
</html>`;
}
