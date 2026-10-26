<a href="https://birzeit.me"><img src="og.png" alt="ECE Labs, Birzeit University: every ECE lab, in one place." width="100%"></a>

# ECE Labs · birzeit.me

The landing page at [birzeit.me](https://birzeit.me) that lists every lab of the Department of Electrical & Computer Engineering at Birzeit University, with search across lab codes, boards and topics.

**[Open birzeit.me](https://birzeit.me)** · [ENCS4110](https://encs4110.birzeit.me) · [ENCS4101](https://encs4101.birzeit.me) · [ENCS5150](https://encs5150.birzeit.me)

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
| `index.html` | The current page at `/`: markup, styles, theme switch, search, lab preview, analytics |
| `v1/index.html` | The first design, frozen at `/v1/` (not indexed by search engines) |
| `legacy/index.html` | Redirects `/legacy/` to `/v1/` |
| `og.png`, `og.svg` | Link-preview image and its source (render with Inkscape, Geist fonts installed) |
| `favicon.png`, `apple-touch-icon.png` | Icons |
| `sitemap.xml`, `robots.txt` | Search engine files, with sitemaps for all four sites |
| `CNAME` | `birzeit.me` |
| `.github/workflows/deploy.yml` | Stamps the last-updated date and deploys to GitHub Pages |

### Versions

Each design lives in its own folder and is served as is. To freeze the current page before a redesign, copy `index.html` to `vN/index.html`, add `<meta name="robots" content="noindex">`, add the folder to the `cp` line in the deploy workflow, and link it from the footer.

### Adding a lab

Copy one of the `<article class="lab">` blocks in `index.html` and update:

- `data-lab`, `data-kind` (`hardware` or `software`), `data-code` and `data-url`
- `data-search`, the words the search box matches
- the text, the links, the "Lab 0N" number, and the topic buttons (`data-q` is the search term each one sets)
- the lab's accent colors, in the two `[data-lab=…]` rules (light and dark theme)

To show it in the hero preview too, add a `.ptab` button and a matching `.pane`, and change the `.ind` width to one over the number of tabs.

Then add the lab to the structured data (`application/ld+json`) and its sitemap to `robots.txt`.

## Contributing

[Open an issue](https://github.com/ECE-Birzeit/landing-page/issues/new/choose) or send a pull request. The [contributing guide](https://github.com/ECE-Birzeit/.github/blob/main/CONTRIBUTING.md) covers the rest.

## Deployment

On every push to `main`, `.github/workflows/deploy.yml` writes the latest commit date into the footer and the sitemap, then deploys to GitHub Pages at [birzeit.me](https://birzeit.me).

## License

[MIT](LICENSE) © [Mohammad Abu-Shelbaia](https://mabushelbaia.com). The Birzeit University name and logo are the university's; they are not licensed here.

---

<sub>Part of [ECE Labs](https://birzeit.me) · Maintained by [Mohammad Abu-Shelbaia](https://mabushelbaia.com)</sub>
