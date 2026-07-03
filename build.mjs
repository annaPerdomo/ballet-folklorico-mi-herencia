/* ════════════════════════════════════════════════════════════════════
   build.mjs — pre-render one fully-localized static page per language.

   Reads index.html (the template, with data-i18n markup + English head)
   and i18n-data.js (the translations + per-language SEO meta), then writes:

       index.html          → English  (also the x-default at https://bfmh.dance/)
       es/index.html       → Español
       ja/index.html       → 日本語
       zh/index.html       → 简体中文
       zh-hant/index.html  → 繁體中文

   Each page gets: <html lang>, baked-in localized text, a localized
   <title>/meta/Open Graph/Twitter head, a self-referential canonical,
   reciprocal hreflang to all four + x-default, and localized JSON-LD.

   Run:  npm run build   (or: node build.mjs)
   No dependencies — pure string transforms, so the template's hand-tuned
   SVGs, entities and whitespace pass through untouched.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./i18n-data.js');                      // sets globalThis.__I18N__
const I18N = globalThis.__I18N__;

const BASE = 'https://bfmh.dance';
const LANGS = ['en', 'es', 'ja', 'zh', 'zht'];
const template = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// ── helpers ─────────────────────────────────────────────────────────
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function seasonFor(lang, date) {
  const m = date.getMonth();
  const idx = m < 3 ? 0 : m < 6 ? 1 : m < 9 ? 2 : 3;
  return I18N.seasons[lang][idx];
}

// Replace the `content="…"` of a <meta> identified by `name="x"`/`property="x"`.
function setMeta(html, selector, value) {
  const re = new RegExp(`(<meta ${selector} content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`meta not found: ${selector}`);
  return html.replace(re, `$1${escAttr(value)}$2`);
}

const LANG_NAMES = {
  en: { name: 'English', code: 'en' },
  es: { name: 'Spanish', code: 'es' },
  ja: { name: 'Japanese', code: 'ja' },
  zh: { name: 'Chinese (Simplified)', code: 'zh-Hans' },
  zht: { name: 'Chinese (Traditional)', code: 'zh-Hant' }
};

// ── per-language render ──────────────────────────────────────────────
function render(lang, now) {
  const m = I18N.meta[lang];
  const S = I18N.strings[lang];
  const url = BASE + m.path;
  const year = now.getFullYear();
  const season = seasonFor(lang, now);
  const tokens = (v) => v.replace(/\{year\}/g, year).replace(/\{season\}/g, season);

  let out = template;

  // ── <html lang> ──
  out = out.replace(/<html lang="[^"]*">/, `<html lang="${m.htmlLang}">`);

  // ── <title> ──
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(m.title)}</title>`);

  // ── primary meta ──
  out = setMeta(out, 'name="description"', m.description);
  out = setMeta(out, 'name="keywords"', m.keywords);

  // ── canonical + reciprocal hreflang (identical set on every page) ──
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  const hreflangs = [
    `  <link rel="alternate" hreflang="en" href="${BASE}/" />`,
    `  <link rel="alternate" hreflang="es" href="${BASE}/es/" />`,
    `  <link rel="alternate" hreflang="ja" href="${BASE}/ja/" />`,
    `  <link rel="alternate" hreflang="zh-Hans" href="${BASE}/zh/" />`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${BASE}/zh-hant/" />`,
    `  <link rel="alternate" hreflang="x-default" href="${BASE}/" />`
  ].join('\n');
  // Match the whole run of alternate links (3 on first build, 5 thereafter) → idempotent.
  out = out.replace(
    /(?:  <link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>\n?)+/,
    hreflangs + '\n'
  );

  // ── Open Graph ──
  out = setMeta(out, 'property="og:url"', url);
  out = setMeta(out, 'property="og:title"', m.ogTitle);
  out = setMeta(out, 'property="og:description"', m.ogDescription);
  out = setMeta(out, 'property="og:image:alt"', m.ogImageAlt);
  const alternates = LANGS.filter((l) => l !== lang)
    .map((l) => `  <meta property="og:locale:alternate" content="${I18N.meta[l].ogLocale}" />`).join('\n');
  // Match og:locale + every following og:locale:alternate (1 on first build, 3 after) → idempotent.
  out = out.replace(
    /  <meta property="og:locale" content="[^"]*" \/>(?:\n  <meta property="og:locale:alternate" content="[^"]*" \/>)*/,
    `  <meta property="og:locale" content="${m.ogLocale}" />\n${alternates}`
  );

  // ── Twitter ──
  out = setMeta(out, 'name="twitter:title"', m.ogTitle);
  out = setMeta(out, 'name="twitter:description"', m.ogDescription);
  out = setMeta(out, 'name="twitter:image:alt"', m.ogImageAlt);

  // ── JSON-LD (localize DanceGroup + FAQ; leave the Event list alone) ──
  out = out.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (block, json) => {
    let data;
    try { data = JSON.parse(json); } catch { return block; }
    const types = [].concat(data['@type'] || []);

    if (types.includes('DanceGroup')) {
      data.url = url;
      data.description = m.schemaDescription;
      data.inLanguage = ['en', 'es', 'ja', 'zh-Hans', 'zh-Hant'];
      data.availableLanguage = LANGS.map((l) => ({
        '@type': 'Language', name: LANG_NAMES[l].name, alternateName: LANG_NAMES[l].code
      }));
    } else if (data['@type'] === 'FAQPage') {
      data.inLanguage = m.htmlLang;
      data.mainEntity = [1, 2, 3, 4, 5, 6].map((i) => ({
        '@type': 'Question',
        name: S['faq.q' + i],
        acceptedAnswer: { '@type': 'Answer', text: S['faq.a' + i] }
      }));
    } else {
      return block; // Event ItemList: dates/venues are proper nouns — untouched
    }
    return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n  </script>`;
  });

  // ── body: data-i18n-html (raw inner HTML) ──
  out = out.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (match, open, tag, key, _inner, close) =>
      S[key] === undefined ? match : open + tokens(S[key]) + close
  );

  // ── body: data-i18n (escaped text) ──
  out = out.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (match, open, tag, key, _inner, close) =>
      S[key] === undefined ? match : open + escText(tokens(S[key])) + close
  );

  // ── body: data-placeholder-i18n (placeholder attribute) ──
  out = out.replace(/<[^>]*\bdata-placeholder-i18n="([^"]+)"[^>]*>/g, (match, key) =>
    S[key] === undefined ? match : match.replace(/\bplaceholder="[^"]*"/, `placeholder="${escAttr(tokens(S[key]))}"`)
  );

  // ── language switcher: current label + active item ──
  out = out.replace(
    /(<span class="lang-switch-current" id="langSwitchCurrent">)[^<]*(<\/span>)/,
    `$1${escText(I18N.native[lang])}$2`
  );
  // Clear any previously-baked active flag, then mark this language's link.
  out = out.replace(/(<a role="menuitem"[^>]*?) aria-current="true"/g, '$1');
  out = out.replace(
    new RegExp(`(<a role="menuitem" data-lang="${lang}")`),
    `$1 aria-current="true"`
  );

  // ── banner: make it obvious which files are generated (idempotent) ──
  const banner = lang === 'en'
    ? `<!--\n  This is the English page AND the source template for /es/ /ja/ /zh/ /zh-hant/.\n  Edit here: structure · text -> i18n-data.js · styles -> styles.css · behavior -> app.js\n  Then regenerate every language page:  node build.mjs\n-->\n`
    : `<!--\n  !! AUTO-GENERATED -- DO NOT EDIT THIS FILE. !!\n  Built from index.html by build.mjs. Edit the source instead:\n    structure -> index.html · text -> i18n-data.js · styles -> styles.css · behavior -> app.js\n  Then run:  node build.mjs\n-->\n`;
  out = out.replace(/^<!DOCTYPE html>\n(?:<!--[\s\S]*?-->\n)?/, '<!DOCTYPE html>\n' + banner);

  return out;
}

// ── write all pages ─────────────────────────────────────────────────
const now = new Date();
for (const lang of LANGS) {
  const html = render(lang, now);
  const dir = I18N.meta[lang].path; // "/", "/es/", …
  if (dir === '/') {
    writeFileSync(new URL('./index.html', import.meta.url), html, 'utf8');
    console.log(`  ✓ index.html            (en, x-default)`);
  } else {
    const folder = dir.replace(/^\/|\/$/g, '');
    mkdirSync(new URL(`./${folder}/`, import.meta.url), { recursive: true });
    writeFileSync(new URL(`./${folder}/index.html`, import.meta.url), html, 'utf8');
    console.log(`  ✓ ${folder}/index.html`.padEnd(26) + `(${lang})`);
  }
}
console.log('\nBuilt 5 localized pages → https://bfmh.dance/  /es/  /ja/  /zh/  /zh-hant/');
