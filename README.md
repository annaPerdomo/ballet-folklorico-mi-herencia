<div align="center">

# Ballet Folklórico Mi Herencia

### Tradition in Motion.

The official site for **Ballet Folklórico Mi Herencia** — the community-rooted Mexican folk dance group I perform with, based in Hacienda Heights, CA. I built and maintain this site for my group, which is available for festivals, quinceañeras, weddings, and corporate events across LA, the San Gabriel Valley, the Inland Empire, and Orange County.

Built as a fast, fully bilingual marketing site with serious local-SEO so the group gets found by people searching "folklorico for hire" in Southern California.

[![Live Site](https://img.shields.io/badge/Visit-bfmh.dance-7C2D12?style=for-the-badge&logo=vercel&logoColor=white)](https://bfmh.dance)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Formspree](https://img.shields.io/badge/Formspree-E5122E?style=flat&logo=maildotru&logoColor=white)
![Google Analytics 4](https://img.shields.io/badge/GA4-E37400?style=flat&logo=googleanalytics&logoColor=white)
![Microsoft Clarity](https://img.shields.io/badge/Microsoft_Clarity-2C6EF2?style=flat&logo=microsoftedge&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

<img src="docs/screenshot.png" alt="Ballet Folklórico Mi Herencia — Tradition in Motion" width="100%" />

</div>

## Highlights

- **Multilingual (EN · ES · JA · 简体 · 繁體)** — every language is a real, pre-rendered URL (`/`, `/es/`, `/ja/`, `/zh/`, `/zh-hant/`) with its own `<html lang>`, localized `<title>`/meta, self-referential canonical, and reciprocal `hreflang` tags — the proper way to do multilingual SEO. A language dropdown of real links lets visitors (and crawlers) switch — with JS enabled the swap happens in place (no reload, URL updated via `pushState`); without it the links still work as plain navigation.
- **Safe language auto-detect at the CDN edge** — `vercel.json` redirects first-time visitors on the root `/` to their browser's language before any HTML downloads (zero function invocations — pure routing config, free on Hobby). An explicit switcher choice is remembered (cookie + localStorage) and always wins, the language sub-pages are never auto-redirected (shared links stay intact), and crawlers (en-US) stay on `/`, so SEO is unaffected. An inline script on `/` provides the same detection as a fallback for local dev or non-Vercel hosting.
- **Local SEO, done properly** — descriptive `<title>`, rich meta description and keywords targeting "folklorico for hire" across dozens of SoCal cities, per-language Open Graph + JSON-LD (`DanceGroup`, `FAQPage`, `DanceEvent`), `robots.txt`, and a `sitemap.xml` with `hreflang` alternates.
- **Booking & contact** — an inquiry form wired to [Formspree](https://formspree.io/) so the group can take performance requests without a backend.
- **Performance-first** — hand-built static pages (no framework). Shared CSS (`styles.css`) and JS (`app.js`) are linked once and cached across pages; the language pages are generated from a single source by a tiny dependency-free build script.
- **Analytics, three layers** — Vercel Web Analytics for traffic, Google Analytics 4 for engagement (scroll depth, engagement time, and custom events), and Microsoft Clarity for heatmaps and session recordings. A single shared event helper fires each interaction to both GA4 and Clarity at once, and tags every hit with the visitor's language — so I can see which locales convert and where inquiries actually come from.
- **Booking CTAs** — clear "Book a Performance" and "Join the Group" calls to action, plus sections for About, Events, and Classes.

## Tech & approach

| Concern        | Approach                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Markup/Styles  | Hand-authored, framework-free **HTML / CSS / JavaScript**                |
| Localization   | `data-i18n` template + `i18n-data.js` dictionary, pre-rendered per URL   |
| SEO            | Per-language meta, Open Graph, JSON-LD, `hreflang`, `robots.txt`, `sitemap.xml` |
| Forms          | Formspree AJAX submissions (no server required)                          |
| Analytics      | Vercel Web Analytics + Google Analytics 4 + Microsoft Clarity (one shared event helper) |
| Hosting        | Vercel — static deploy, instant cache, push-to-deploy                    |

## Where to edit what

Everything shared lives in **one file each** — no styling or behavior is duplicated
across the language pages:

| Edit this…        | …to change                                                       | Rebuild needed? |
| ----------------- | ---------------------------------------------------------------- | --------------- |
| **`styles.css`**  | any styling (shared by all pages, linked not embedded)           | No — refresh    |
| **`app.js`**      | any behavior/JS (shared by all pages)                            | No — refresh    |
| **`i18n-data.js`**| copy & translations + per-language SEO meta (EN/ES/JA/简体/繁體)  | **Yes**         |
| **`index.html`**  | page **structure** (the template; also the English page)         | **Yes**         |

The language pages (`/es/ /ja/ /zh/ /zh-hant/` and the English `index.html`) carry
baked-in translated text for SEO, so they're **generated** — they begin with a
`DO NOT EDIT` banner. Pure CSS or JS changes need no rebuild (those files are
linked); copy or structure changes do.

**`build.mjs`** reads `index.html` + `i18n-data.js` and writes five fully-localized pages:

| URL                    | Lang         | File              |
| ---------------------- | ------------ | ----------------- |
| `https://bfmh.dance/`  | English (x-default) | `index.html` |
| `https://bfmh.dance/es/` | Español    | `es/index.html`   |
| `https://bfmh.dance/ja/` | 日本語      | `ja/index.html`   |
| `https://bfmh.dance/zh/` | 简体中文    | `zh/index.html`   |
| `https://bfmh.dance/zh-hant/` | 繁體中文 | `zh-hant/index.html` |

> ⚠️ The `/es/`, `/ja/`, `/zh/`, `/zh-hant/` pages **and** the English `index.html`
> are generated. After editing copy in `i18n-data.js` or structure in `index.html`,
> **re-run the build** or those pages go stale:
>
> ```bash
> node build.mjs        # no dependencies — pure Node, regenerates all 5 pages
> ```

To preview locally, build first, then serve the folder so the absolute paths and
`/es/` `/ja/` `/zh/` `/zh-hant/` routes resolve:

```bash
node build.mjs
python3 -m http.server 8000   # then visit http://localhost:8000
```

Deployment is push-to-`main` on Vercel; the generated pages are committed and
served as-is (no build step runs on Vercel).

## Team availability app (`/team/`)

Private page for the owners and the dancer families. Replaces the "who is available?" GroupMe thread.

**Flow:** website form → `events` row (status `inquiry`) → owner taps **Ask GroupMe who's available** (one tap; the bot posts the question in the group and reads the replies) or **Post to team…** (edit details first, then announce) → families answer in the chat or open their personal link and tap Yes / Maybe / No per dancer → owner sees the roster, sends a reminder to non-responders, adds rehearsals, and clicks **Confirm** → everyone sees the confirmed details in the same place.

**Ask in GroupMe** (`PATCH /api/events/:id {action:"ask"}`, needs `GROUPME_BOT_ID`): opens the gig if it was still an inquiry, posts a bilingual question that shows the reply shapes the reader understands, and stamps `asked_at` / `ask_count`. A bare "yes" or "we can't" with no date goes to the gig the bot asked about most recently. The card shows "Bot asked 2 h ago · 5 of 17 answered"; **Ask again** re-posts with "still looking for answers" wording and **Post tally** puts the current ✓ / ? / ✗ / waiting-on list into the chat.

**Pieces**

- `api/` — Vercel Functions (plain Node, Postgres via `pg`). Schema is created automatically on first request (`api/_lib/db.js`).
- `team/` — the app (vanilla JS, no build step).
- `api/inquiry.js` — the contact form and the landing-page quote forms post a copy of every submission here (see `app.js` / `landing.js`). Formspree still sends the email.
- `api/webhooks/formspree.js` — optional Formspree webhook target (dedupes against the direct post).

**Environment variables** (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Easiest: `vercel integration add neon` (sets it automatically). |
| `ADMIN_PASSWORD` | yes | Owner sign-in password for `/team/`. |
| `SESSION_SECRET` | recommended | Random string used to sign owner sessions (falls back to the password). |
| `SITE_URL` | no | Defaults to `https://bfmh.dance`; used in links inside notifications. |
| `GROUPME_BOT_ID` | no | Create a bot at https://dev.groupme.com/bots for the team group; when set, "Ask GroupMe", "Post to team", "Confirm", "Send reminder", and "Post tally" post into GroupMe automatically. Without it, use the **Copy …** buttons and paste. |
| `GROUPME_WEBHOOK_SECRET` | no | Turns on the **GroupMe reader** (below). Any random string; the bot's callback URL must include it. |
| `GROUPME_GROUP_ID`, `GROUPME_BOT_ACK` | no | Reader options: only accept messages from this group id; set `GROUPME_BOT_ACK=0` to stop the "🤖 Noted…" replies. |
| `RESEND_API_KEY`, `NOTIFY_FROM` | no | Email notifications to families via Resend. |
| `FORMSPREE_WEBHOOK_SECRET` | no | If you enable the Formspree webhook plugin, point it at `/api/webhooks/formspree?secret=<value>`. |

**GroupMe reader (the bot reads the chat and fills in availability)**

Families keep answering in the group chat the way they always have; the bot turns those replies into Yes / Maybe / No per dancer.

1. Create the bot at https://dev.groupme.com/bots in the team group. Copy its **Bot ID** into `GROUPME_BOT_ID`.
2. Pick a random string for `GROUPME_WEBHOOK_SECRET` and set the bot's **Callback URL** to
   `https://bfmh.dance/api/webhooks/groupme?secret=<that string>`.
3. Redeploy. The **Team** tab in `/team/` shows every message the bot read and what it did with it.

How it reads a message (`api/_lib/groupme-parse.js`, English and Spanish; the tests use real replies from the group):

- **Each line is one answer.** "No for 19th / Yes for 26th / No for 10/13" records three answers. Dates can be "9/19", "Sept 19", "the 19th", "Sep 25&26", "September 12 ,19 ,25", "el 4 de octubre". A bare day number matches the open gig on that day.
- **Who:** dancer names in the text ("Yes for Lia and Donatien"), carried forward to later lines ("Isabella" on its own line, then one date per line). A first name that two dancers share is resolved to the sender's family. With no names ("we can't", "yes!", "My girls are yes on all") it applies to the sender: the family linked to that GroupMe account, else a family/dancer whose name matches the sender's GroupMe name ("Folk-…" prefixes and "(…)" suffixes are ignored). The first time a family answers this way their GroupMe account is linked for next time (owners can clear it via `PATCH /api/families?id=… {groupme_user_id:null}`). Owners' own accounts should stay unlinked so announcements are never read as answers.
- **What:** maybe ("not sure", "no sé", "tal vez") beats no ("can't", "no puede") beats yes ("can go", "yes", "sí", "available"). "all" means every open gig.
- **Which gig:** the dates in the message. If a message names dates anywhere, lines without a date are ignored rather than guessed. A short message with no date at all ("Kiley is a yes!") goes to the gig named in it ("…perform at Paramount!") or else the most recently posted one, and the bot's reply says it assumed.
- Messages with no yes/no/maybe are ignored. Everything is logged to `groupme_messages` (visible in the Team tab); nothing is ever deleted, and owners can override any answer by tapping the chips in the gig roster.
- **New families:** a reply from someone not in the roster is logged as "Unknown sender" with an **Add this family** button that pre-fills the family and dancer names from their GroupMe display name ("Folk-Maricela Orozco (Ashley Emily & Sharlene)" → Orozco: Ashley, Emily, Sharlene) and then re-reads the message. **Read again** re-runs any logged message against the current roster.

Run the parser tests with `node --test "api/_lib/*.test.mjs"`.

**Show on website.** On a confirmed gig, **Show on website** lists it under Upcoming Events on bfmh.dance within about five minutes, using the venue as the name and the city as the location. `api/public-events.js` serves the flagged gigs and `app.js` merges them with the static list in `i18n-data.js` (no rebuild). Hide it again with the same button. The static list is still the place for past years and for the JSON-LD event schema.

**Local development**

```bash
npm install
vercel env pull .env.local        # pulls DATABASE_URL etc. from Vercel (or copy .env.example and use a local Postgres)
npm run dev                       # reads .env.local, serves http://localhost:3456/team/
```

`.env.local` must contain `DATABASE_URL` and `ADMIN_PASSWORD`; the server warns at startup if either is missing, and API errors name the missing variable.

**First-time setup for the owners:** sign in at `/team/` with the password → **Team** tab → add each family with their dancers → **Copy invite link** and send it to that family once (DM or text). The link is their login; **New link** revokes an old one.
