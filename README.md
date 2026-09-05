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

**Flow:** website form → `events` row (status `inquiry`) → owner taps **Ask GroupMe who's available** (one tap; the bot posts the question in the group and reads the replies) or, for a gig with no date yet, **Post to team** (publishes it and announces it in the group) → families answer in the chat or open their personal link and tap Yes / Maybe / No per dancer → owner sees the roster, sends a reminder to non-responders, adds rehearsals, and clicks **Confirm** → everyone sees the confirmed details in the same place.

**Everything is posted from the site.** There is no copy-and-paste path any more: each button below is one `PATCH /api/events/:id` and La Chona says it in the group. Her posts are English (one message for everyone) with bilingual tap lines; the wording lives in `api/_lib/notify.js`.

| Button | Action | What lands in GroupMe |
| --- | --- | --- |
| Ask GroupMe who's available | `ask` | `📢 New gig request received! Who can join us for this one?` + gig, date · time · place, a sample reply, the signed gig link, and a 📅 add-to-calendar link that opens the Apple / Google / Outlook chooser |
| Post the announcement | `announce` | `📣 New gig: are you available?` + the full summary, calendar link, and "Mark your availability" link |
| Post tally to GroupMe | `tally` | `📊 <gig> — <date>` then ✓ / ? / ✗ names and "Waiting on: …" |
| Send reminder | `remind` | `⏰ Reminder — <gig> on <date>. Still need an answer from: <names>.` + link |
| Confirm gig / Post the confirmation | `confirm` / `reconfirm` | `✅ CONFIRMED:` + summary, calendar link, the dancer list, rehearsals, and the details link |

`ask` also opens the gig if it was still an inquiry and stamps `asked_at` / `ask_count`. It needs an event date — replies are matched by date. A bare "yes" or "we can't" with no date goes to the gig with the latest activity: the most recent ask or post. The card shows "Bot asked 2 h ago · 5 of 17 answered", and **Ask again** re-posts with "still looking for answers" wording. `announce` and `reconfirm` re-send the publish and confirm messages without changing the gig's status.

Sample ask, exactly as it arrives:

```
📢 New gig request received! Who can join us for this one?
Quinceañera — Ramirez
Wed, Nov 4 · 7:00 PM–7:30 PM · Grand Ballroom, West Covina

Reply "Sofia yes for Nov 4" or "we can't".
Or tap / O toca: https://bfmh.dance/team/?e=42&s=…
📅 Add to my calendar / Agregar a mi calendario: https://bfmh.dance/team/?e=42&s=…&cal=1
```

The **La Chona** tab in `/team/` shows all five messages verbatim, so the owners can see what the group will get before they tap.

**Built for phones.** Owners and families use this from a phone almost every time, so the layout is phone-first: a thumb-height tab bar at the bottom (Inbox · Gigs · Team · La Chona), a floating **+** for a new gig, and every dialog is a bottom sheet with its main button pinned under the thumb. Each gig row carries a **headcount ring** — dancers who said yes over dancers needed — so nobody counts heads. Tapping a gig opens the detail sheet: the big headcount, the roster grouped into Going / Maybe / Not going / Waiting, one primary button that changes with the moment (Ask GroupMe → Remind N waiting → Confirm gig → Post the confirmation → Mark done) and a **⋯** menu with everything else. Tapping a dancer's name opens a four-button answer sheet (Going / Maybe / Not going / Clear) and the roster updates before the server replies. Families get one-tap **All yes / All no** for the whole household. Inquiry cards have tap-to-call and tap-to-text. The roster re-pulls itself whenever the app comes back to the foreground.

**Home-screen app.** `/team/manifest.webmanifest` plus `team/icons/` (the dancers logo on the plum ground with BFMH in gold, from the "App Icon Final" design; `scripts/team-icon.html` rendered by `sh scripts/team-icon.sh` with headless Chrome) make the page installable. iPhone: Safari → Share → **Add to Home Screen** (the app shows a one-time nudge with these steps; Android shows an **Install** button). `team/sw.js` is the offline shell: network first, so a deploy is never served stale, with the cached shell as the fallback when the signal is gone — the installed app has no address bar, so a cold start in a venue basement would otherwise be a dead end. API calls are never cached; a stale roster is worse than an honest error. La Chona's circular portrait badge comes from `python3 scripts/team-icon.py` (a 256px WebP for her tab, and a 512px PNG for her GroupMe bot avatar). Note that on iOS the installed app keeps its own cookies, so an owner signs in once inside it; links tapped in GroupMe still open in Safari.

**Pieces**

- `api/` — Vercel Functions (plain Node, Postgres via `pg`). Schema is created automatically on first request (`api/_lib/db.js`).
- `team/` — the app (vanilla JS, no build step).
- `api/inquiry.js` — the contact form and the landing-page quote forms post a copy of every submission here (see `app.js` / `landing.js`). Formspree still sends the email.
- `api/webhooks/[source].js` — the Formspree webhook target (optional; dedupes against the direct post) and the GroupMe bot callback, in one function.

  The Hobby plan allows 12 Vercel Functions per deployment, so a few endpoints share a file. `api/families.js` also serves `/api/dancers` and `/api/availability`, which `vercel.json` rewrites to it with `?r=`; `dev-server.mjs` mirrors those rewrites. Every public URL is unchanged — split them back out on a plan with more room.
- `api/calendar.js` + `api/_lib/ics.js` — calendar files. One gig at a time (`?e=&s=` from a GroupMe post, or `?event=` with a session cookie — the **Add to my calendar** button on every gig card, the gig detail sheet and the family picker), a family's subscribable feed (`?f=&k=`, the Calendar card at the foot of the family's home tab), or the owners' feed of every gig (`?a=<sig>`, the Calendar card at the foot of the **Gigs** tab).
- `api/gig.js` — the "who's answering?" screen behind that same signed link, readable with no cookie.

  The generated `.ics` is plain RFC 5545 — CRLF endings, folded at 75 octets, times resolved to UTC — so Apple Calendar, Google Calendar and Outlook all read it. Subscribing is where they differ: only Apple answers a `webcal:` link, so **Add every gig to your calendar** opens a sheet that hands the same feed URL to Google (`calendar.google.com/calendar/r?cid=`) and Outlook (`outlook.live.com/calendar/0/addfromweb?url=`) by their own add-by-URL pages, with the raw link to copy for anything else.

**Links and who they let in.** Four different things are signed with `SESSION_SECRET`, and they are deliberately not interchangeable:

| Link | Who holds it | What it opens |
| --- | --- | --- |
| `/team/?k=<invite token>` | one family, sent to them once | Full member sign-in: answer, and edit the household's dancers. **New link** revokes it. |
| `/team/?e=<id>&s=<sig>` | anyone in the GroupMe chat | The gig, then a family picker. Picking one gives an answer-only session that cannot add, rename or delete dancers, and only while the gig is still open or confirmed. It lasts until they sign out or the owners tap **New link**. |
| `/api/calendar?f=<id>&k=<sig>` | whoever the family subscribes with | That family's calendar feed, minus any gig every dancer in the household answered No to. Never a sign-in. Rotates with the invite link. |
| `/api/calendar?a=<sig>` | the owners, in their own calendar app | Every gig, pay line included. Never a sign-in. Changing `ADMIN_PASSWORD` retires it. |

**Environment variables** (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Easiest: `vercel integration add neon` (sets it automatically). |
| `ADMIN_PASSWORD` | yes | Owner sign-in password for `/team/`. Owners stay signed in until they sign out; changing this password signs every owner device out (and nothing else — gig and calendar links keep working). |
| `SESSION_SECRET` | yes | Random string used to sign owner sessions, gig links and calendar feeds. It falls back to `ADMIN_PASSWORD`, but then changing the password invalidates every gig and calendar link already sitting in the GroupMe chat ("That link is not valid"). Set it once and leave it. |
| `SITE_URL` | no | Defaults to `https://bfmh.dance`; used in links inside notifications. |
| `GROUPME_BOT_ID` | **yes, in practice** | Create a bot at https://dev.groupme.com/bots for the team group. Every message the app sends goes out as La Chona; without it the buttons report "La Chona is not connected" and nothing reaches the chat. |
| `GROUPME_WEBHOOK_SECRET` | no | Turns on the **GroupMe reader** (below). Any random string; the bot's callback URL must include it. |
| `GROUPME_GROUP_ID`, `GROUPME_BOT_ACK` | no | Reader options: only accept messages from this group id; set `GROUPME_BOT_ACK=0` to stop the "🤖 Noted…" replies. |
| `FORMSPREE_WEBHOOK_SECRET` | no | If you enable the Formspree webhook plugin, point it at `/api/webhooks/formspree?secret=<value>`. |

**GroupMe reader (the bot reads the chat and fills in availability)**

Families keep answering in the group chat the way they always have; the bot turns those replies into Yes / Maybe / No per dancer.

1. Create the bot at https://dev.groupme.com/bots in the team group. Copy its **Bot ID** into `GROUPME_BOT_ID`.
2. Pick a random string for `GROUPME_WEBHOOK_SECRET` and set the bot's **Callback URL** to
   `https://bfmh.dance/api/webhooks/groupme?secret=<that string>`.
3. Redeploy. The **La Chona** tab in `/team/` shows every message the bot read and what it did with it.

How it reads a message (`api/_lib/groupme-parse.js`, English and Spanish; the tests use real replies from the group):

- **Each line is one answer.** "No for 19th / Yes for 26th / No for 10/13" records three answers. Dates can be "9/19", "Sept 19", "the 19th", "Sep 25&26", "September 12 ,19 ,25", "el 4 de octubre". A bare day number matches the open gig on that day.
- **Who:** dancer names in the text ("Yes for Lia and Donatien"), carried forward to later lines ("Isabella" on its own line, then one date per line). A first name that two dancers share is resolved to the sender's family. With no names ("we can't", "yes!", "My girls are yes on all") it applies to the sender: the family linked to that GroupMe account, else a family/dancer whose name matches the sender's GroupMe name ("Folk-…" prefixes and "(…)" suffixes are ignored). The first time a family answers this way their GroupMe account is linked for next time (owners can clear it via `PATCH /api/families?id=… {groupme_user_id:null}`). Owners' own accounts should stay unlinked so announcements are never read as answers.
- **What:** maybe ("not sure", "no sé", "tal vez") beats no ("can't", "no puede") beats yes ("can go", "yes", "sí", "available"). "all" means every open gig.
- **Which gig:** the dates in the message. If a message names dates anywhere, lines without a date are ignored rather than guessed. A short message with no date at all ("Kiley is a yes!") goes to the gig named in it ("…perform at Paramount!") or else the most recently posted one. The bot only replies when an answer actually changed.
- Messages with no yes/no/maybe are ignored. Everything is logged to `groupme_messages` (visible in the Team tab); nothing is ever deleted, and owners can override any answer by tapping the chips in the gig roster.
- **New families:** a reply from someone not in the roster is logged as "Unknown sender" with an **Add this family** button that pre-fills the family and dancer names from their GroupMe display name ("Folk-Maricela Orozco (Ashley Emily & Sharlene)" → Orozco: Ashley, Emily, Sharlene) and then re-reads the message. **Read again** re-runs any logged message against the current roster.

Run the parser tests with `node --test "api/_lib/*.test.mjs"`.

**Show on website.** On a confirmed gig, **Show on website** lists it under Upcoming Events on bfmh.dance within about five minutes, using the venue as the name and the city as the location. `api/public-events.js` serves the flagged gigs and `app.js` merges them with the static list in `i18n-data.js` (no rebuild); it also appends a matching `DanceEvent` entry to the page's Event JSON-LD (`addEventsToJsonLd` in `app.js`), so these gigs are eligible for the same Google Event rich results as the static list. Hide it again with the same button. The static list is still the place for past years, and it's the only source hand-tuned per language by `build.mjs` (localized descriptions etc.) — team-published entries reuse a generic English description regardless of page language.

**Local development**

```bash
npm install
vercel env pull .env.local        # pulls DATABASE_URL etc. from Vercel (or copy .env.example and use a local Postgres)
npm run dev                       # reads .env.local, serves http://localhost:3456/team/
```

`.env.local` must contain `DATABASE_URL` and `ADMIN_PASSWORD`; the server warns at startup if either is missing, and API errors name the missing variable.

**First-time setup for the owners:** sign in at `/team/` with the password → **Team** tab → add each family with their dancers → **Copy invite link** and send it to that family once (DM or text). The link is their login; **New link** revokes an old one — including any answer-only sessions and calendar feeds minted from it.
