---
name: frostie
description: >-
  Create App Store AND Google Play store assets for a mobile app in one pass:
  explore the app on an iOS simulator over argent, author argent flows for its
  key user flows, render framed App Store screenshots and a plain preview
  video, then the Google Play layer — 1080×1920 phone screenshots from the
  same captures and design, the mandatory 1024×500 feature graphic and a
  Play-rules checklist — and open frostie's dual-store live studio. Use it
  whenever the user asks for store screenshots, marketing assets, store
  assets, Google Play assets, a feature graphic, an app preview video, or
  mentions frostie — even for "make screenshots for the store". Also for
  follow-ups: new headlines, a different background or bezel, reordering
  screenshots, regenerating either store's set. Run from the app's repo.
---

# frostie: App Store + Google Play assets for the app in this repo

frostie replays argent YAML flows on an iOS simulator, captures raw
screenshots and recordings, and turns them into upload-ready assets for BOTH
stores: App Store screenshots get a device bezel, background and marketing
copy; the preview video is the raw recordings joined as-is (Apple requires a
plain screen recording); the Google Play set is re-rendered from the same
captures and design at Play's specs (1080×1920 + a 1024×500 feature
graphic). One config, one set of flows, one design — both stores stay in
sync. The rendering engine is the pinned npm package `goldie@0` (MIT), used
as a library; frostie's own studio at http://localhost:4322 shows both store
pages live. Your job is everything the pipeline cannot do alone: pick the
screens worth marketing, author the flows, write the copy, drive the stages.

The end state: 4–5 framed App Store screenshots + preview clips, the Play
set (`out/screenshots/play/<locale>/` + `out/play/feature-graphic.jpg`), and
the dual-store studio open for the user.

## Before anything: check for an existing setup

frostie keeps the whole outcome in files the user can re-prompt against. If
the app repo already has a config, this is a follow-up — read it first and
skip to "Iterating on an existing setup":

```bash
ls goldie/goldie.config.ts .argent/flows/ 2>/dev/null; echo "GOLDIE_CONFIG=$GOLDIE_CONFIG"
```

Read `goldie/goldie.config.ts` in full and the flows it names. Together they
are the source of truth for every visible choice: which screens, in what
order, the headlines and subheads, colors, bezel, the store listing, the
preview story. A user who says "make it darker" or "swap the search
screenshot" is asking for an edit to those files (or a studio change, which
lands in `goldie.design.json`).

## Step 0: Make sure the engine runs

The engine is an npm package; nothing needs cloning:

```bash
npx -y goldie@0 help
```

Every engine command below is `GOLDIE_CONFIG=<app-repo>/goldie/goldie.config.ts
npx -y goldie@0 <cmd>` (shell state does not persist between Bash calls, so
prefix every command). Needs Node 20+ and `ffmpeg` on the PATH
(`brew install ffmpeg`). frostie's own scripts live in this plugin's repo:
`<frostie-root>/scripts/{studio.mjs,play-export.mjs}` where `<frostie-root>`
is two directories above this SKILL.md (the repo root).

## Step 1: Gather app facts

From the app repo, find:

- **App name and bundle id** — Xcode project, `app.json` / `app.config.*`
  (Expo), or `Info.plist`.
- **A Release simulator build** — newest
  `~/Library/Developer/Xcode/DerivedData/<App>-*/Build/Products/Release-iphonesimulator/<App>.app`.
  A Debug build needs Metro and paints LogBox banners into captures — build
  Release with the repo's own scripts if only Debug exists.
- **Web app?** Use the stub pattern: a minimal sleeping `.app` satisfies
  `appPath`, scenes open the production site in Safari (or a PWA web clip
  launched via Spotlight for full-screen). Selectors by text often fail in
  Safari — prefer `tool: await-ui-element` + coordinate taps in flows.

## Step 2: Explore the app and choose the scenes

Use argent MCP tools (bundled with this plugin) to see the app before
deciding anything. Boot an iPhone 16/17 Pro Max class simulator, install the
Release build, launch it, and walk the main screens with `describe` and
`screenshot`. Check `.argent/flows/` for existing recorded flows — the best
source of working selectors.

Choose:

- **4 or 5 screenshot scenes** — one screen each that sells a feature; prefer
  real-looking content.
- **A 3–4 segment preview story** — one short user journey in order; clips
  are joined with no captions, total must land between 15 and 30 seconds.

Note exact visible labels / accessibility ids for selectors, and normalized
coordinates for anything unlabeled (icon-only tab bars).

## Step 3: Author the config and flows

```
<app-repo>/
├── .argent/flows/
│   ├── store-01-<scene>.yaml ...        one per screenshot scene
│   └── store-preview-01-<segment>.yaml  one per preview segment
└── goldie/goldie.config.ts
```

A scene names its flow the way `argent flow run <name>` does. Prefix
marketing flows with `store-`; reuse an existing flow when one already
reaches the screen. Read `references/config.md` for the config schema, an
annotated example and copywriting guidance; `references/flows.md` for the
flow YAML vocabulary. Write headlines and subheads yourself in the app's
voice — benefit-led and short.

Output lands in `<app-repo>/goldie/out/` — add it to `.gitignore`; commit
the config and flows. Each flow is runnable alone with
`argent flow run store-01-home` — the fastest pre-capture check.

## Step 4: Doctor, then capture

```bash
GOLDIE_CONFIG=... npx -y goldie@0 doctor
```

Fix everything doctor flags (usual: argent video watermark flag, screenshot
scale override, a Debug build). Then capture and render stills:

```bash
GOLDIE_CONFIG=... npx -y goldie@0 capture
GOLDIE_CONFIG=... npx -y goldie@0 frame
GOLDIE_CONFIG=... npx -y goldie@0 manifest
```

`capture` replays every flow including preview segments, so raw clips exist
for the lazy video render later.

### When a flow breaks

Flows replay with no LLM — a wrong selector fails loudly with the step and
argent's reason. Fix over argent MCP: `describe` the live screen, correct
the YAML, re-run capture. Prefer `text:`/`id:` selectors; when only a
coordinate works, add an `echo:` step above it explaining what it points at.

## Step 5: Google Play layer + the dual-store studio

Render the Play set (re-uses captures and the shared design):

```bash
GOLDIE_CONFIG=... node <frostie-root>/scripts/play-export.mjs   # --bezel keeps the iPhone frame
```

- Phone screenshots **1080×1920** (9:16) → `out/screenshots/play/<locale>/`;
  ≥4 at ≥1080 px qualify for Play's large recommendation formats (frostie
  warns below 4).
- **Feature graphic** `out/play/feature-graphic.jpg` — exactly 1024×500,
  JPEG (Play rejects alpha PNGs); mandatory on every Play listing.
- Screen-only by default — no Apple hardware on a Play listing.
- Ends with a Play checklist (report it verbatim): counts, promo
  eligibility, 512×512 icon reminder, video is a **YouTube link only**
  (upload `out/previews/**/preview.mp4` public/unlisted, ads off).

Then start frostie's studio in the background and tell the user the URL:

```bash
GOLDIE_CONFIG=... node <frostie-root>/scripts/studio.mjs   # http://localhost:4322
```

The studio shows the App Store page and the Google Play listing (tabs) with
one live Design panel — background, font, template, layout, per-tile
headlines, tile order, per-scene layout, bezel variant, screen-only and Play
bezel toggles. Every change auto-saves `goldie.design.json` and re-renders
BOTH stores server-side in about a second. The Export button downloads an
upload-ready ZIP with both stores' assets; the checks panel shows Apple and
Play rule validation.

Meanwhile render the preview video in the background:

```bash
GOLDIE_CONFIG=... npx -y goldie@0 preview && GOLDIE_CONFIG=... npx -y goldie@0 manifest
```

If `preview` refuses (outside 15–30 s), adjust segment pacing (`wait:`
steps, `holdSeconds`) and re-capture only what changed. Finish with
`GOLDIE_CONFIG=... npx -y goldie@0 verify` and report which assets exist,
where, and whether they pass the rules.

## Iterating on an existing setup

A follow-up maps onto a small change plus the cheapest stage that reflects
it. Do not re-explore or rewrite scenes the user did not mention. Report
which file and field changed. Studio edits land in `goldie.design.json` and
survive re-renders; copy a value into the config only when the user wants it
as the new baseline.

| The user asks for | Edit | Then run |
|---|---|---|
| Different headline, subhead or store copy | studio, or `scenes[].headline` / `subhead`, `store.*` | studio auto-renders; else `frame`, `manifest`, `play-export.mjs` |
| A new look: background, colors, font, sizing | studio, or `theme.*` | as above |
| A different bezel, or no bezel | studio (frame/screen-only), or `frame.variant`, `theme.screenOnly` | as above |
| A varied strip: panorama, hero, tilt, breather | studio template, or `theme.template` | as above |
| A different layout for every tile, or one | studio, or `theme.layout` / `scenes[].layout` | as above |
| Two screens in one tile / two-tile panorama | `scenes[].layout: "duo"`/`"panorama-duo"` + `secondScene`, or `"panorama"` | `frame`, `manifest`, `play-export.mjs` |
| Badge, sticker or logo on tiles | `theme.decorations` / `scenes[].decorations` | `frame`, `manifest`, `play-export.mjs` |
| Dark mode captures | `appearance: "dark"` + matching text colors | `capture`, then renders |
| Reorder, drop or add a screenshot | studio (order), or `scenes[]`; new scene = new flow | `capture` (new flows), renders |
| A different state on one screen | the scene's flow YAML | `capture`, renders |
| Preview story or pacing | preview `segments[]`, `holdSeconds`, `wait:` | `capture`, `preview`, `manifest` |
| Another locale | `locales` + `<locale>` in every copy record | `capture`, all renders |
| Play set with the device bezel | studio toggle, or `play-export.mjs --bezel` | — |
| Tablet screenshots (7"/10") | out of scope — Play needs them only when opting into tablet distribution; tell the user | — |

## Notes

- The Play render and the studio need `out/raw/<device>/` from `capture`.
- frostie self-installs its engine copy into `~/.cache/frostie/` on first
  run (npm), so the first invocation takes a minute.
- Config format is `goldie.config.ts` + `goldie.design.json` — any existing
  goldie project works with frostie unchanged.
