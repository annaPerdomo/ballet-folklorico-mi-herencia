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

function groupByFamily(dancers) {
  const groups = [];
  for (const d of dancers) {
    const family = d.family || '';
    const last = groups[groups.length - 1];
    if (last && last.family === family) last.members.push(d);
    else groups.push({ family, members: [d] });
  }
  return groups;
}

export function renderSheet({ events, dancers, availability, lang = 'en', printedAt = new Date() }) {
  const es = lang === 'es';
  const title = sheetTitle(events, lang);
  const withFamily = dancers.some((d) => d.family);
  const cols = events.length + (withFamily ? 2 : 1);

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
      return `<th class="gig">${parts.join('')}</th>`;
    })
    .join('');

  const answerCells = (d) => events
    .map((ev) => {
      const status = answerByKey.get(`${ev.id}:${d.id}`);
      const cls = status === 'yes' ? 'c-yes' : status === 'no' ? 'c-no' : status === 'maybe' ? 'c-maybe' : 'c-none';
      return `<td class="${cls}">${esc(cellText(status, lang))}</td>`;
    })
    .join('');

  let n = 0;
  const bodyRows = groupByFamily(dancers)
    .map((g) => g.members
      .map((d, i) => {
        n += 1;
        const famCell = !withFamily ? '' : i === 0 ? `<td class="fam" rowspan="${g.members.length}">${esc(g.family)}</td>` : '';
        return `<tr class="${i === 0 ? 'first' : ''}">${famCell}<td class="name"><span class="n">${n}.</span> ${esc(d.name)}</td>${answerCells(d)}</tr>`;
      })
      .join(''))
    .join('');

  const blankRow = `<tr class="first blank">${withFamily ? '<td class="fam"></td>' : ''}<td class="name"></td>${events.map(() => '<td></td>').join('')}</tr>`;
  const blankRows = blankRow + blankRow;

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

  const meta = es
    ? `Impreso ${printedDate} · ${dancers.length} bailarines`
    : `Printed ${printedDate} · ${dancers.length} dancers`;
  const legend = es
    ? 'En blanco = sin respuesta · Van = confirmados / necesarios'
    : 'Blank = no answer yet · Going = confirmed / needed';
  const printLabel = es ? 'Imprimir o guardar PDF' : 'Print or save as PDF';
  const hint = es
    ? 'En el teléfono, toca Compartir y luego Imprimir o Guardar en Archivos. Con más de cuatro eventos, elige horizontal en el cuadro de impresión.'
    : 'On a phone, tap Share, then Print or Save to Files. With more than four gigs, choose landscape in the print dialog.';
  const famHeader = es ? 'Familia' : 'Family';
  const nameHeader = es ? 'Bailarín' : 'Dancer';
  const goingLabel = es ? 'Van' : 'Going';

  return `<!doctype html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
@page { margin: 0.5in }
* { box-sizing: border-box }
body { font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; color: #111; background: #fff; margin: 0 }
.bar { background: #1e1230; color: #fff; padding: 14px 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px }
.bar button { font: inherit; font-weight: 700; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: #1e1230;
  background: linear-gradient(135deg, #e8c97a, #c9a84c); border: 0; border-radius: 12px; padding: 12px 20px; cursor: pointer; min-height: 48px }
.bar p { margin: 0; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.8); max-width: 60ch }
.page { padding: 18px 18px 24px }
.brand { font-size: 8pt; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; color: #6b4a8a; margin: 0 0 2px }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 3px double #c9a84c; margin-bottom: 10px }
h1 { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 19pt; font-weight: 700; letter-spacing: 0.02em; margin: 0; line-height: 1.1 }
.meta { font-size: 8.5pt; color: #555; white-space: nowrap; padding-bottom: 3px }
table { border-collapse: collapse; width: 100%; page-break-inside: auto }
th, td { border: 1px solid #b5b5b5; padding: 4px 6px; vertical-align: top }
thead th { background: #f1ecf6; text-align: left; font-size: 8.5pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact }
thead th.gig { min-width: 5.5em }
thead th.name, thead th.fam { vertical-align: bottom; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.12em; color: #555 }
thead th .date { font-weight: 700; font-size: 9.5pt; color: #111 }
thead th .title { font-weight: 600 }
thead th .place, thead th .time { color: #444 }
tbody tr { page-break-inside: avoid }
tbody td { height: 24px }
tbody tr.first td, tfoot td { border-top: 2px solid #444 }
tbody tr.blank td { height: 26px }
td.fam { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b4a8a; width: 1%; white-space: nowrap; vertical-align: top; padding-top: 6px; background: #faf8fc; -webkit-print-color-adjust: exact; print-color-adjust: exact }
td.name { white-space: nowrap; font-weight: 600 }
td.name .n { display: inline-block; min-width: 1.8em; color: #888; font-weight: 400; font-variant-numeric: tabular-nums }
tbody td:not(.name):not(.fam), tfoot td:not(:first-child) { text-align: center }
.c-yes { font-weight: 700 }
.c-no { color: #8a8a8a }
.c-maybe { font-style: italic; color: #444 }
tfoot td { background: #f1ecf6; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact }
tfoot td:first-child { text-transform: uppercase; letter-spacing: 0.12em; font-size: 8pt; color: #555 }
tfoot .of { font-weight: 400; color: #666 }
.legend { margin: 8px 0 0; font-size: 8pt; color: #666; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap }
@media print { .bar { display: none } .page { padding: 0 } }
@media screen and (max-width: 640px) { .page { padding: 12px; overflow-x: auto } .head { flex-direction: column; align-items: flex-start } }
</style>
</head>
<body>
<div class="bar">
<button onclick="window.print()">${esc(printLabel)}</button>
<p>${esc(hint)}</p>
</div>
<div class="page">
<p class="brand">Ballet Folklórico Mi Herencia</p>
<div class="head"><h1>${esc(title)}</h1><div class="meta">${esc(meta)}</div></div>
<table>
<thead>
<tr>${withFamily ? `<th class="fam">${esc(famHeader)}</th>` : ''}<th class="name">${esc(nameHeader)}</th>${headCells}</tr>
</thead>
<tbody>
${bodyRows}
${blankRows}
</tbody>
<tfoot>
<tr><td${withFamily ? ' colspan="2"' : ''}>${esc(goingLabel)}</td>${footCells}</tr>
</tfoot>
</table>
<p class="legend"><span>${esc(legend)}</span><span>bfmh.dance/team</span></p>
</div>
</body>
</html>`;
}
