/* ════════════════════════════════════════════════════════════════════
   build-landing.mjs — pre-render localized copies of the standalone
   landing pages (quinceañeras / weddings / school-assemblies / pricing).

   The English page in each folder is BOTH the template and the served
   English page (it carries data-i18n markup + the full hreflang block).
   This script reads it and writes the four translated siblings:

       es/<slug>/index.html      → Español
       ja/<slug>/index.html      → 日本語
       zh/<slug>/index.html      → 简体中文
       zh-hant/<slug>/index.html → 繁體中文

   Translations live in landing-i18n.js (page-specific) and are topped up
   with the homepage's own dictionary i18n-data.js for shared chrome
   (footer, nav, form labels) so nothing is translated twice.

   Run:  node build-landing.mjs   (or: npm run build:landing)
   Pure string transforms, no dependencies — same philosophy as build.mjs.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./i18n-data.js');       // → globalThis.__I18N__
require('./landing-i18n.js');    // → globalThis.__LANDING__
const I18N = globalThis.__I18N__;
const LAND = globalThis.__LANDING__;

const BASE = 'https://bfmh.dance';
const LANGS = ['es', 'ja', 'zh', 'zht'];          // en is the hand-authored template
const PREFIX   = { es: '/es', ja: '/ja', zh: '/zh', zht: '/zh-hant' };
const HTMLLANG = { es: 'es', ja: 'ja', zh: 'zh-Hans', zht: 'zh-Hant' };

// ── helpers (same escaping rules as build.mjs) ──────────────────────
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setMeta(html, selector, value) {
  const re = new RegExp(`(<meta ${selector} content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`meta not found: ${selector}`);
  return html.replace(re, `$1${escAttr(value)}$2`);
}

// Merge homepage strings + landing shared + this page's strings for one language.
function dictFor(pageKey, lang) {
  return Object.assign(
    {},
    I18N.strings[lang] || {},
    (LAND.shared && LAND.shared[lang]) || {},
    LAND.pages[pageKey].lang[lang] || {}
  );
}

// ── per-language render ──────────────────────────────────────────────
function render(pageKey, lang, template) {
  const page = LAND.pages[pageKey];
  const D = dictFor(pageKey, lang);
  const M = page.meta[lang];
  const url = BASE + PREFIX[lang] + page.path;
  const homeUrl = BASE + PREFIX[lang] + '/';
  let out = template;

  // ── <html lang> ──
  out = out.replace(/<html lang="[^"]*">/, `<html lang="${HTMLLANG[lang]}">`);

  // ── head: title + meta ──
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(M.title)}</title>`);
  out = setMeta(out, 'name="description"', M.description);
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  out = setMeta(out, 'property="og:url"', url);
  out = setMeta(out, 'property="og:title"', M.ogTitle);
  out = setMeta(out, 'property="og:description"', M.ogDescription);
  out = setMeta(out, 'name="twitter:title"', M.ogTitle);
  out = setMeta(out, 'name="twitter:description"', M.ogDescription);

  // ── JSON-LD: localize Breadcrumb, Service, FAQ (leave anything else) ──
  out = out.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (block, json) => {
    let data;
    try { data = JSON.parse(json); } catch { return block; }

    if (data['@type'] === 'BreadcrumbList') {
      data.itemListElement = data.itemListElement.map((li) => {
        if (li.position === 1) return { ...li, name: D['nav.home'], item: homeUrl };
        return { ...li, name: D['bc'], item: url };
      });
    } else if ([].concat(data['@type']).includes('Service')) {
      data.name = D['bc'];
      data.description = M.description;
      data.url = url;
      data.inLanguage = HTMLLANG[lang];
    } else if (data['@type'] === 'FAQPage') {
      data.inLanguage = HTMLLANG[lang];
      const items = [];
      for (let i = 1; D['faq' + i + '.q']; i++) {
        items.push({
          '@type': 'Question',
          name: D['faq' + i + '.q'],
          acceptedAnswer: { '@type': 'Answer', text: D['faq' + i + '.a'] }
        });
      }
      data.mainEntity = items;
    } else {
      return block;
    }
    return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n  </script>`;
  });

  // ── body: data-i18n-html (raw inner HTML) ──
  out = out.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (match, open, tag, key, _inner, close) =>
      D[key] === undefined ? match : open + D[key] + close
  );

  // ── body: data-i18n (escaped text) ──
  out = out.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (match, open, tag, key, _inner, close) =>
      D[key] === undefined ? match : open + escText(D[key]) + close
  );

  // ── body: data-placeholder-i18n (placeholder attribute) ──
  out = out.replace(/<[^>]*\bdata-placeholder-i18n="([^"]+)"[^>]*>/g, (match, key) =>
    D[key] === undefined ? match : match.replace(/\bplaceholder="[^"]*"/, `placeholder="${escAttr(D[key])}"`)
  );

  // ── language switcher: current label + active item ──
  out = out.replace(
    /(<span class="lang-switch-current" id="langSwitchCurrent">)[^<]*(<\/span>)/,
    `$1${escText(I18N.native[lang])}$2`
  );
  out = out.replace(/(<a role="menuitem"[^>]*?) aria-current="true"/g, '$1');
  out = out.replace(
    new RegExp(`(<a role="menuitem" data-lang="${lang}")`),
    `$1 aria-current="true"`
  );

  // ── generated-file banner ──
  const banner = `<!--\n  !! AUTO-GENERATED — DO NOT EDIT THIS FILE. !!\n  Built from ${page.file} by build-landing.mjs. Edit the English page +\n  landing-i18n.js instead, then run:  node build-landing.mjs\n-->\n`;
  out = out.replace(/^<!DOCTYPE html>\n(?:<!--[\s\S]*?-->\n)?/, '<!DOCTYPE html>\n' + banner);

  return out;
}

// ── write everything ─────────────────────────────────────────────────
let count = 0;
for (const pageKey of Object.keys(LAND.pages)) {
  const page = LAND.pages[pageKey];
  const template = readFileSync(new URL('./' + page.file, import.meta.url), 'utf8');
  const slug = page.path.replace(/^\/|\/$/g, '');
  for (const lang of LANGS) {
    const html = render(pageKey, lang, template);
    const folder = PREFIX[lang].replace(/^\//, '') + '/' + slug;
    mkdirSync(new URL('./' + folder + '/', import.meta.url), { recursive: true });
    writeFileSync(new URL('./' + folder + '/index.html', import.meta.url), html, 'utf8');
    console.log(`  ✓ ${folder}/index.html`);
    count++;
  }
}
console.log(`\nBuilt ${count} localized landing pages.`);
