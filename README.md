<div align="center">

# 💃 Ballet Folklórico Mi Herencia

### Tradition in Motion.

The official site for **Ballet Folklórico Mi Herencia** — the community-rooted Mexican folk dance group I perform with, based in Hacienda Heights, CA. I built and maintain this site for my group, which is available for festivals, quinceañeras, weddings, corporate events, and school assemblies across LA, the San Gabriel Valley, the Inland Empire, and Orange County.

Built as a fast, fully bilingual marketing site with serious local-SEO so the group gets found by people searching "folklorico for hire" in Southern California.

[![Live Site](https://img.shields.io/badge/Visit-bfmh.dance-7C2D12?style=for-the-badge&logo=vercel&logoColor=white)](https://bfmh.dance)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Formspree](https://img.shields.io/badge/Formspree-E5122E?style=flat&logo=maildotru&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

<img src="docs/screenshot.png" alt="Ballet Folklórico Mi Herencia — Tradition in Motion" width="100%" />

</div>

## Highlights

- **Fully bilingual (ES/EN)** — a client-side i18n layer swaps every string via `data-i18n` attributes and a language toggle, with `hreflang` (`es`, `en`, `x-default`) tags so search engines serve the right language.
- **Local SEO, done properly** — descriptive `<title>`, rich meta description and keywords targeting "folklorico for hire" across dozens of SoCal cities, Open Graph image, `robots.txt`, and a `sitemap.xml`.
- **Booking & contact** — an inquiry form wired to [Formspree](https://formspree.io/) so the group can take performance requests without a backend.
- **Performance-first** — a single hand-built static page (no framework, no build step) that loads instantly and is trivial to host.
- **Analytics** — Vercel Web Analytics to understand where visitors and inquiries come from.
- **Booking CTAs** — clear "Book a Performance" and "Join the Group" calls to action, plus sections for About, Events, and Classes.

## Tech & approach

| Concern        | Approach                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Markup/Styles  | Hand-authored, framework-free **HTML / CSS / JavaScript**                |
| Localization   | Custom `data-i18n` dictionary + language toggle, with `hreflang` tags    |
| SEO            | Targeted meta tags, Open Graph, `robots.txt`, `sitemap.xml`              |
| Forms          | Formspree AJAX submissions (no server required)                          |
| Analytics      | Vercel Web Analytics                                                     |
| Hosting        | Vercel — static deploy, instant cache, push-to-deploy                    |

## Local development

No build tooling required — it's a static site.

```bash
# Serve the folder so relative paths resolve correctly:
python3 -m http.server 8000
# then visit http://localhost:8000
```

Deployment is push-to-`main` on Vercel; every file is served as-is.
