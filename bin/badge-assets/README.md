# AI attribution badges

A small set of badges for saying how AI was actually used in a piece of work.
Two axes carry all the meaning:

- **The preposition says who led.** `with` keeps the colour on the edge — a
  person did the work and used a tool. `by` floods the badge — the tool did the
  work.
- **The verb says how much of the thing the tool brought into being.** `edited`
  is quiet, `written` sits in the middle, `created` is loud.

Six badges, then, per tool. Every tool wears the same spectrum; only the logo
plate carries a brand colour, so the family reads as one mark rather than as
somebody else's advertising.

The design comes from the "AI Attribution Badges" canvas, board **B3 — Soft
pill, site palette**. Its cool spectrum is anchored on `#3379BE`, which is the
link colour bennorris.com already uses.

## Where everything lives

| Path | What it is |
| --- | --- |
| `bin/badge` | The generator. Writes the whole matrix and the manifest. |
| `bin/badge-assets/spec.py` | The design, as data: spectra, treatments, grounds, geometry, fonts, tools. **Change the badges here.** |
| `bin/badge-assets/logos/` | Vendor marks, each reduced to a single path. |
| `badge/` | Generated SVGs. Published as-is. Never edit by hand. |
| `_data/ai_badges.yml` | Generated manifest: every badge, its label, and its dimensions. |
| `_includes/ai-badge.html` | The Jekyll include, for posts and pages. |
| `badges.html` | The picker at `/badges/`. |
| `_sass/basically-basic/_ai-badges.scss` | How a badge sits in the flow of a page. |

`bin/` is excluded from the Jekyll build, so the generator and the vendor marks
never ship. The fonts are not vendored at all — the generator reads the same
`assets/fonts/iAWriterDuoS-*.woff` the stylesheet serves.

## Regenerating

```sh
python3 -m venv .venv
.venv/bin/pip install -r bin/badge-assets/requirements.txt
.venv/bin/python bin/badge
```

That rewrites `badge/` from scratch and refreshes `_data/ai_badges.yml`. Commit
both. `bin/badge --check` rebuilds into a temp directory and fails if what is
committed has drifted from the spec; CI runs it on every push.

Other useful invocations:

```sh
bin/badge --one written with claude          # one badge, to stdout
bin/badge --one created by chatgpt --size lg --theme dark
bin/badge --font quattro                     # the whole set in Quattro instead
```

## Using a badge

In a post or page:

```liquid
{% include ai-badge.html verb="written" prep="with" tool="claude" %}
{% include ai-badge.html verb="created" prep="by" tool="chatgpt" size="sm" %}
{% include ai-badge.html verb="edited" prep="with" tool="claude" link=false %}
```

Anywhere else, including a README:

```markdown
![Written with Claude](https://bennorris.com/badge/written-with/claude.svg)
```

URLs are `/badge/<verb>-<prep>/<tool>[-<size>][-<theme>].svg`. The default size
and the adaptive theme have no suffix, so `claude.svg` is the default badge,
`claude-sm-dark.svg` is the small one pinned dark.

## Why the type is outlined

An SVG used as an `<img>` cannot fetch a webfont, run script, or load a
stylesheet. A badge that set `font-family` would render in whatever the viewer
happened to have, at whatever width that face produced — so the pill would not
even be the right size around its own label. Converting the label to outlines
at generate time fixes the appearance and the geometry together, and is what
lets these files survive GitHub's image proxy intact.

It also means the badge can wear iA Writer Duo, the face `$base-font-family`
actually puts first. The original board reached for IBM Plex Sans only because
a badge had no way to load anything else; with the type outlined, the font is
needed when the file is written and never again. `fontTools` reads `.woff`
directly, so the generator uses the same files the stylesheet serves — the
badges add no fonts to the repo and no third-party face to a page.

The cost is that a badge's text is fixed at generate time. That is the whole
reason this is a build step rather than a server: adding a tool means adding it
to `TOOLS` in `spec.py` and regenerating.

## Adding a tool

1. Get the official mark from the vendor's own brand page as an SVG, and reduce
   it to a single `<path>` with a `viewBox`. The generator refuses anything
   else, on purpose: a badge should not be carrying a logo nobody looked at.
2. Drop it in `bin/badge-assets/logos/`.
3. Add an entry to `TOOLS` in `spec.py`: the label as the vendor spells it, the
   plate colour for light and dark grounds, the mark colour on each, and the
   bleed (how large the mark draws relative to the 22px plate).
4. Regenerate, and check the new badges on both grounds.

Marks are used nominatively — to name the tool that did the work — which is why
the spectrum stays the system's and only the plate is ever the vendor's. Check
the vendor's brand terms before adding one.

## The adaptive file

`<tool>.svg` carries both treatments and switches with
`prefers-color-scheme`. The dark group is hidden by default, so anything that
ignores the media query still gets a correct light badge rather than both at
once.

GitHub caches README images through its own proxy, so the adaptive file is not
reliable there; use `-light` and `-dark` with `<picture>` instead.

## If this ever needs to be dynamic

The generator is already split so that it could be: `spec.py` is pure data and
`render()` in `bin/badge` is a pure function of `(verb, prep, tool, size,
theme)`. Porting it to a Worker would mean bundling subset glyph outlines for
arbitrary text — the only part that genuinely needs a server. Until a badge has
to say something that is not in the matrix, static files cost nothing to serve
and nothing to keep running.
