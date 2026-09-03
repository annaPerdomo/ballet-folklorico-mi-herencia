// Parents answer one gig per line ("No for 19th\nYes for 26th"), so each line is a unit and
// names carry forward across lines. The test file holds the real replies this was tuned on.

export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();

const MAYBE = [
  /\bmaybe\b/, /\bmight\b(?! be (?:a (?:little|bit) )?late)/, /\bnot sure\b/, /\bunsure\b/, /\bpossibly\b/, /\bprobably\b/, /\bdepends\b/, /\btentative/,
  /\blet (?:you|u|them) know\b/, /\bwill (?:check|confirm|see)\b/, /\bhave to (?:check|see)\b/, /\bstill checking\b/, /\bknow more\b/,
  /\btal vez\b/, /\bquizas?\b/, /\ba lo mejor\b/, /\bpuede ser\b/, /\bno (?:se|sabemos|esta[n]? segur|estoy segur|estamos segur)/,
  /\b(?:isn'?t|not|aren'?t) (?:sure|certain)\b/, /\bdepende\b/, /\bles? aviso\b/, /\bte aviso\b/, /\bvoy a ver\b/, /\btengo que ver\b/,
  /\bposiblemente\b/, /\bprobablemente\b/, /🤷|🤔/,
];
const NO = [
  /\bcan'?t\b/, /\bcannot\b/, /\bcan ?not\b/, /\bwon'?t\b/, /\bunable\b/, /\bnot (?:able|available|going|coming|make|gonna|attend)/,
  /\bno\b(?! (?:problem|worries|rush|way|idea|thanks|te preocupes|hay problema))/, /\bnope\b/, /\bnah\b/, /\bpass\b/, /\bskip/, /\bconflict/, /\bsick\b/, /\bwill miss\b/, /\bhas to miss\b/, /\bhave to miss\b/,
  /\bno (?:puede|pueden|podemos|podra|podran|podremos|voy|va|van|vamos|estare|estaremos|estara|estaran|podre|creo)\b/,
  /\bocupad/, /\benferm/, /\bimposible\b/, /\bno (?:vamos|voy) a poder\b/, /❌|👎|🚫|✗|✖/,
];
const YES = [
  /\byes\b/, /\byep\b/, /\byeah\b/, /\byup\b/, /^sure\b/, /\bable\b/, /\bavailable\b/, /\bcoming\b/,
  /\bcan(?: (?:go|come|make|do|attend|be there|dance|perform|join|both|all|definitely|also|still|totally|work))?\s*$/,
  /\bcan (?:go|come|make|do|attend|be there|dance|perform|join|both|all|definitely|also|still|totally)\b/,
  /\bcould (?:make|do|go|come|attend|be there|perform|dance|join)\b/, /\bmake it\b/, /\bwill be there\b/, /\bbe there\b/,
  /\bcount (?:me|us|her|him|them)\b/, /\b(?:i'?m|we'?re|she'?s|he'?s|they'?re|is|are) in\b/,
  /\bsi\b/, /\bclaro\b/, /\bpuede[ns]?\b/, /\bpodemos\b/, /\bpodra[n]?\b/, /\bpodre\b/, /\bvamos\b/, /\bvoy\b/, /\bva[n]?\b/,
  /\bestaremos\b/, /\bestare\b/, /\bestara[n]?\b/, /\bdisponible/, /\bcontamos\b/, /\bcuenten? con/, /\blist[oa]s?\b/, /\bahi estar/,
  /✅|✔|💃/,
];
const FAMILY_WORDS = [/\bwe\b/, /\bus\b/, /\bour\b/, /\bboth\b/, /\ball (?:of us|three|3|four|4)\b/, /\bmy (?:kids|girls|boys|daughters?|sons?|children)\b/,
  /\bnosotr/, /\bambas\b/, /\bambos\b/, /\blas dos\b/, /\blos dos\b/, /\btod[oa]s\b/, /\bmis (?:hij|nin)/, /\bla familia\b/, /\bfamily\b/, /\bfamilia\b/];
const SELF_WORDS = [/\b(?:i|yo) (?:can|could|will|am|cannot|can'?t|won'?t|unfortunately|sadly|might|may|no)\b/, /\bi'?m\b/, /\bcount me\b/, /\bme (?:too|neither)\b/];
const ALL_WORDS = [/\ball\b/, /\bevery(?:thing| one of them| date| event)\b/, /\btod[oa]s\b/];

// Don't loosen: "what time is call on the 19th?" must never become an answer.
const EXPLICIT = [/\byes\b/, /\bno\b(?! (?:problem|worries|rush|way|idea|thanks))/, /\bsi\b/, /\bcan'?t\b/, /\bcannot\b/, /\bno (?:puede[ns]?|podemos|va[n]?|vamos|voy)\b/,
  /\bnot available\b/, /\bunable\b/, /\bcount (?:me|us|her|him|them)\b/, /\bmaybe\b/, /\bnot sure\b/, /\btal vez\b/, /\bquizas?\b/,
  /\b(?:i|we|she|he|they) (?:can|could|will|cannot|can'?t|won'?t)\b/, /\bcould make\b/, /\bmake it\b/, /\bwill be there\b/, /\bpuedo\b/, /\bpodemos\b/, /\bpuede[ns]?\b/];
const REQUEST = [/\blet (?:me|us) know\b/, /\bplease (?:reply|respond|confirm|let)\b/, /\bavisenme\b/, /\bavisame\b/, /\bconfirmen\b/, /\bwho (?:can|is)\b/, /\bquien(?:es)? (?:puede|va)/];
const isQuestion = (raw) => /\?\s*$/.test(String(raw).trim());

const any = (list, s) => list.some((re) => re.test(s));

export function detectIntent(clause) {
  const s = norm(clause);
  if (!s) return null;
  if (any(MAYBE, s)) return 'maybe';
  if (any(NO, s)) return 'no';
  if (any(YES, s)) return 'yes';
  return null;
}

const SPLIT = /[.;!?]+|,|\s[-–—]\s|\b(?:but|pero|aunque|however|sin embargo|except|menos)\b/i;

// Keeps "12 ,19 ,25" and "Sept 19, 2026" from being split on their commas.
function tidyDates(line) {
  return line.replace(/(\d)\s*,\s*(20\d\d)\b/g, '$1').replace(/(\d)\s+(20\d\d)\b/g, '$1')
    .replace(/(\d)(?:st|nd|rd|th)?\s*,\s*(?=\d{1,2}(?:st|nd|rd|th)?\b)/g, '$1 & ');
}

export function splitClauses(text) {
  return String(text || '').split(/\n+/).flatMap((line) => tidyDates(line).split(SPLIT)).map((c) => c.trim()).filter(Boolean);
}

function nameIndex(dancers) {
  const full = []; const first = new Map();
  for (const d of dancers) {
    const n = norm(d.name);
    if (!n) continue;
    full.push({ key: n, dancer: d });
    const f = n.split(' ')[0];
    if (!first.has(f)) first.set(f, []);
    first.get(f).push(d);
  }
  full.sort((a, b) => b.key.length - a.key.length);
  return { full, first };
}
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(?:^|[^a-z0-9])${esc(w)}(?![a-z0-9])`);

export function findNames(clause, idx, preferFamilyId) {
  let s = norm(clause);
  const found = []; const ambiguous = [];
  for (const { key, dancer } of idx.full) {
    if (key.length < 3) continue;
    const re = wordRe(key);
    if (re.test(s)) { found.push(dancer); s = s.replace(re, ' '); }
  }
  for (const [f, list] of idx.first) {
    if (f.length < 3 || !wordRe(f).test(s)) continue;
    if (list.length === 1) { if (!found.includes(list[0])) found.push(list[0]); continue; }
    const mine = preferFamilyId ? list.filter((d) => d.family_id === preferFamilyId) : [];
    if (mine.length === 1) { if (!found.includes(mine[0])) found.push(mine[0]); }
    else ambiguous.push(f);
  }
  return { found, ambiguous };
}

export function resolveSender({ senderName, senderUserId }, { dancers, families }) {
  if (senderUserId) {
    const fam = families.find((f) => f.groupme_user_id && String(f.groupme_user_id) === String(senderUserId));
    if (fam) return { family: fam, dancer: null, how: 'linked' };
  }
  // Group display names look like "Folk-Claudia Marin (DT & Lia)" or "Anna Mendez Perdomo (Adult)".
  const s = norm(senderName).replace(/^folk-?\s*/, '').replace(/\(.*?\)/g, '').trim();
  if (!s) return null;
  const exact = dancers.filter((d) => norm(d.name) === s);
  if (exact.length === 1) return { family: families.find((f) => f.id === exact[0].family_id) || null, dancer: exact[0], how: 'dancer-name' };
  const famByName = families.filter((f) => { const n = norm(f.name); return n && (s.includes(n) || n.includes(s)); });
  if (famByName.length === 1) return { family: famByName[0], dancer: null, how: 'family-name' };
  const last = s.split(' ').pop();
  if (last && last.length >= 3) {
    const bySurname = families.filter((f) => norm(f.name).split(/[^a-z]+/).includes(last));
    if (bySurname.length === 1) return { family: bySurname[0], dancer: null, how: 'surname' };
  }
  const firstName = s.split(' ')[0];
  const byFirst = dancers.filter((d) => norm(d.name).split(' ')[0] === firstName);
  if (byFirst.length === 1) return { family: families.find((f) => f.id === byFirst[0].family_id) || null, dancer: byFirst[0], how: 'dancer-first-name' };
  return null;
}

const MONTHS = { jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, dic: 12 };
const MONTH_RE = '(jan|ene|feb|mar|apr|abr|may|jun|jul|aug|ago|sept?|oct|nov|dec|dic)[a-z]*';
const DAY_LIST = '(\\d{1,2}(?:st|nd|rd|th)?(?:\\s*(?:&|,|and|y|\\/|-|–)\\s*(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?)*)';
const days = (list) => list.split(/[^\d]+/).filter(Boolean).map(Number);

export function findDates(text) {
  let s = norm(text); const out = [];
  for (const m of s.matchAll(/(?:^|[^\d/])(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?(?!\d)/g)) out.push([+m[1], +m[2]]);
  s = s.replace(/(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?/g, ' ');
  for (const m of s.matchAll(new RegExp(`\\b${MONTH_RE}\\.?\\s+${DAY_LIST}\\b`, 'g'))) for (const d of days(m[2])) out.push([MONTHS[m[1]], d]);
  s = s.replace(new RegExp(`\\b${MONTH_RE}\\.?\\s+${DAY_LIST}\\b`, 'g'), ' ');
  for (const m of s.matchAll(new RegExp(`\\b(?:el\\s+)?${DAY_LIST}\\s+de\\s+${MONTH_RE}`, 'g'))) for (const d of days(m[1])) out.push([MONTHS[m[2]], d]);
  s = s.replace(new RegExp(`\\b(?:el\\s+)?${DAY_LIST}\\s+de\\s+${MONTH_RE}`, 'g'), ' ');
  for (const m of s.matchAll(/\b(?:the|el|on the)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:&|and|y|,)\s*(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?)?\b/g)) {
    out.push([null, +m[1]]); if (m[2]) out.push([null, +m[2]]);
  }
  for (const m of s.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g)) out.push([null, +m[1]]);
  const seen = new Set();
  return out.filter(([mo, d]) => d >= 1 && d <= 31 && (mo == null || (mo >= 1 && mo <= 12)))
    .filter(([mo, d]) => { const k = `${mo}-${d}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function eventsForDates(dates, events, monthHint) {
  const hits = [];
  for (const [mo, d] of dates) {
    let c = events.filter((e) => e.event_date && +e.event_date.slice(8, 10) === d && (mo == null || +e.event_date.slice(5, 7) === mo));
    if (mo == null && c.length > 1 && monthHint) c = c.filter((e) => +e.event_date.slice(5, 7) === monthHint);
    if (mo == null && c.length > 1) c = c.slice().sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 1);
    for (const e of c) if (!hits.includes(e)) hits.push(e);
  }
  return hits;
}

const TYPE_ALIASES = {
  quinceanera: ['quince', 'quinceanera', 'quinceañera', 'xv'], wedding: ['wedding', 'boda'], festival: ['festival', 'feria', 'fiestas'],
  school: ['school', 'assembly', 'escuela'], corporate: ['corporate', 'company', 'empresa'], private: ['private', 'party', 'fiesta'],
};
const STOP = new Set(['for', 'the', 'and', 'with', 'para', 'con', 'del', 'de', 'la', 'el', 'los', 'las', 'event', 'evento', 'inquiry', 'performance', 'gig', 'mall', 'center', 'high', 'hotel']);

function eventWords(e) {
  const words = new Set(norm([e.title, e.event_type, e.venue, e.city, e.client_name].filter(Boolean).join(' '))
    .split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)));
  for (const a of TYPE_ALIASES[e.event_type] || []) words.add(norm(a));
  return words;
}

export function pickEvent(text, events) {
  if (!events.length) return { event: null, guessed: false };
  const s = norm(text);
  const idRef = s.match(/(?:#|\bevent |\bgig |\bevento )(\d{1,6})\b/);
  if (idRef) { const ev = events.find((e) => e.id === +idRef[1]); if (ev) return { event: ev, guessed: false, how: 'id' }; }
  let best = null; let bestScore = 0; let tie = false;
  for (const e of events) {
    let score = 0;
    for (const w of eventWords(e)) if (wordRe(w).test(s)) score++;
    if (score > bestScore) { best = e; bestScore = score; tie = false; } else if (score && score === bestScore) tie = true;
  }
  if (best && !tie) return { event: best, guessed: false, how: 'title' };
  if (events.length === 1) return { event: events[0], guessed: false, how: 'only' };
  const sorted = events.slice().sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')) || b.id - a.id);
  return { event: sorted[0], guessed: true, how: 'latest' };
}

export function parseMessage({ text, senderName, senderUserId }, { dancers, families, events }) {
  const active = dancers.filter((d) => d.active !== false);
  const open = events.filter((e) => !e.status || ['open', 'confirmed'].includes(e.status));
  const sender = resolveSender({ senderName, senderUserId }, { dancers: active, families });
  const idx = nameIndex(active);
  const preferFam = sender && sender.family ? sender.family.id : null;
  const whole = norm(text);
  const famDancers = sender && sender.family ? active.filter((d) => d.family_id === sender.family.id) : [];
  const monthHint = (findDates(text).find(([mo]) => mo != null) || [null])[0];

  const lines = String(text || '').split(/\n+/).map((raw) => {
    const clauses = tidyDates(raw).split(SPLIT).map((c) => c.trim()).filter(Boolean).map((c) => ({
      text: c, intent: detectIntent(c), dates: findDates(c), ...findNames(c, idx, preferFam),
    }));
    const n = norm(raw);
    if (any(REQUEST, n) || (isQuestion(raw) && !any(EXPLICIT, n))) return { units: [], ambiguous: [] };
    const intents = [...new Set(clauses.map((c) => c.intent).filter(Boolean))];
    const lineDates = clauses.flatMap((c) => c.dates);
    const lineNames = clauses.flatMap((c) => c.found);
    const all = any(ALL_WORDS, norm(raw)) && !lineDates.length;
    if (intents.length <= 1) {
      return { units: [{ intent: intents[0] || null, names: lineNames, dates: lineDates, all, self: any(SELF_WORDS, n), explicit: any(EXPLICIT, n) }], ambiguous: clauses.flatMap((c) => c.ambiguous) };
    }
    const units = []; let pendingNames = [];
    for (const c of clauses) {
      if (!c.intent) { pendingNames = pendingNames.concat(c.found); continue; }
      units.push({ intent: c.intent, names: pendingNames.concat(c.found), dates: c.dates.length ? c.dates : lineDates, all, self: any(SELF_WORDS, norm(c.text)), explicit: any(EXPLICIT, norm(c.text)) });
      pendingNames = [];
    }
    return { units, ambiguous: clauses.flatMap((c) => c.ambiguous) };
  });

  const messageHasDates = lines.some((l) => l.units.some((u) => u.dates.length));
  const ambiguous = new Set(lines.flatMap((l) => l.ambiguous));
  const updates = new Map();
  let anyIntent = null; let eventGuessed = false; let contextNames = []; let unresolvedDates = false;
  const short = whole.length <= 240 && text.split(/\n+/).length <= 3;

  const key = (e, d) => `${e.id}:${d.id}`;
  for (const line of lines) {
    for (const u of line.units) {
      if (u.names.length && !u.intent && !u.dates.length) { contextNames = u.names; continue; } // header line: "Isabella" / "For Kiley,"
      if (!u.intent) continue;
      anyIntent = anyIntent || u.intent;

      let who = u.names.length ? u.names : contextNames;
      if (u.names.length) contextNames = u.names;
      if (!who.length && sender) {
        if (!u.explicit) continue; // nobody named: only an explicit "yes / no / can't / no puede" counts
        const wantsFamily = any(FAMILY_WORDS, whole) || !sender.dancer;
        who = wantsFamily && famDancers.length ? famDancers : (sender.dancer ? [sender.dancer] : famDancers);
      } else if (u.self && sender && sender.dancer && !who.includes(sender.dancer)) {
        who = who.concat([sender.dancer]);
      }
      if (!who.length) continue;

      let evs = [];
      if (u.dates.length) { evs = eventsForDates(u.dates, open, monthHint); if (!evs.length) unresolvedDates = true; }
      else if (u.all) evs = open;
      else if (!messageHasDates) {
        const picked = pickEvent(text, open);
        if (picked.event) { evs = [picked.event]; if (picked.guessed) { if (!short) continue; eventGuessed = true; } }
      }
      for (const e of evs) for (const d of who) updates.set(key(e, d), { dancer: d, event: e, status: u.intent });
    }
  }

  let reason = null;
  if (!anyIntent) reason = 'no-intent';
  else if (!updates.size) reason = !sender && !contextNames.length ? 'unknown-sender' : unresolvedDates ? 'no-event-for-date' : !open.length ? 'no-open-event' : (!short && !messageHasDates ? 'too-vague' : 'no-dancers');

  return { intent: anyIntent, sender, updates: [...updates.values()], ambiguous: [...ambiguous], reason, eventGuessed };
}
