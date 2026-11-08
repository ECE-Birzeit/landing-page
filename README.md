<a href="https://birzeit.me"><img src="og.png" alt="ECE Labs, Birzeit University: every ECE lab, in one place." width="100%"></a>

# ECE Labs · birzeit.me

The landing page at [birzeit.me](https://birzeit.me) that lists every lab of the Department of Electrical & Computer Engineering at Birzeit University, with search across lab codes, boards and topics.

**[Open birzeit.me](https://birzeit.me)** · [ENCS4110](https://encs4110.birzeit.me) · [ENCS4101](https://encs4101.birzeit.me) · [ENCS5150](https://encs5150.birzeit.me) · [ENCS5101](https://encs5101.birzeit.me)

## Run it locally

There is no build step. Open `index.html` in a browser, or serve the folder:

```sh
git clone https://github.com/ECE-Birzeit/landing-page.git
cd landing-page
python3 -m http.server 8000   # http://localhost:8000
```

## Project layout

| Path | Contents |
|:--|:--|
| `index.html` | The current page at `/`: markup, styles, theme switch, search, hero preview of a lab page, analytics |
| `scripts/stats.py` | Writes `/stats.json` daily in the deploy: manuals, experiments and code listings from the four lab repos, plus visitors from Google Analytics (keyless sign-in) counted from the semester's first teaching day, which comes from bzu-course-catalog |
| `stats/index.html` | The dashboard at `/stats/`: students, experiment pages opened, students per day, busiest hours, devices, most-opened experiments and every lab, all drawn from `/stats.json` |
| `assets/widgets.js`, `assets/widgets.css` | The chart widgets shared by the home page's "This semester in numbers" section and the dashboard |
| `schedules/index.html` | The ECE weekly schedules at `/schedules/`: browse by instructor, course or room, with a sortable sections table. Reads the live JSON from [bzu-course-catalog](https://github.com/mabushelbaia/bzu-course-catalog) in the browser, so it stays current without redeploys |
| `v1/index.html` | The first design, frozen at `/v1/` (not indexed by search engines) |
| `v2/index.html` | The second design, frozen at `/v2/` (not indexed by search engines) |
| `legacy/index.html` | Redirects `/legacy/` to `/v1/` |
| `og.png`, `og.svg` | Link-preview image and its source (render `og.svg` at 1200×630 in a browser engine, which loads Geist from Google Fonts) |
| `favicon.svg`, `favicon.ico`, `favicon.png`, `apple-touch-icon.png` | Icons: the SVG source, a 16/32/48 px `.ico` (Safari looks for it), a 32 px PNG and the 180 px iOS icon |
| `sitemap.xml`, `robots.txt` | Search engine files, with sitemaps for all four sites |
| `CNAME` | `birzeit.me` |
| `.github/workflows/deploy.yml` | Stamps the last-updated date and deploys to GitHub Pages |

### Versions

Each design lives in its own folder and is served as is. To freeze the current page before a redesign, copy `index.html` to `vN/index.html`, add `<meta name="robots" content="noindex">` and add the folder to the `cp` line in the deploy workflow. Old designs stay reachable at their folder but are not linked from the page.

### Adding a lab

Copy one of the `<article class="lab">` blocks in `index.html` and update:

- `data-lab`, `data-code`, `data-url`, and `data-langs`, the languages students write in that lab, comma-separated (`Assembly,C`). They show on the card's title bar, and the search box matches them
- `data-search`, the words the search box matches
- the course number in `.lab-num`, the name, the platform line and the three links
- the lab's accent colors, in the two `[data-lab=…]` rules (light and dark theme)

The labs sit in a [Swiper](https://swiperjs.com) carousel (3 across on wide screens, 2 on tablets, 1 on phones) that loops and plays on its own, with Swiper's default dots; a new card just joins the loop. Swiper is loaded from cdnjs with an integrity hash. Every card has the same fixed layout: the name always takes three lines' worth of space, so a long title never pushes the rest out of line. The "Lab 0N" labels, the manual count and everything else that lists labs all come from the cards, so there is nothing else to update.

Then add the lab to the structured data (`application/ld+json`) and its sitemap to `robots.txt`.

## Contributing

[Open an issue](https://github.com/ECE-Birzeit/landing-page/issues/new/choose) or send a pull request. The [contributing guide](https://github.com/ECE-Birzeit/.github/blob/main/CONTRIBUTING.md) covers the rest.

## Deployment

On every push to `main`, `.github/workflows/deploy.yml` writes the latest commit date into the footer and the sitemap, then deploys to GitHub Pages at [birzeit.me](https://birzeit.me).

## License

[MIT](LICENSE) © [Mohammad Abu-Shelbaia](https://mabushelbaia.com). The Birzeit University name and logo are the university's; they are not licensed here.

---

<sub>Part of [ECE Labs](https://birzeit.me) · Maintained by [Mohammad Abu-Shelbaia](https://mabushelbaia.com)</sub>
