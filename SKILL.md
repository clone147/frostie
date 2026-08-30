---
name: frostie
description: >-
  Create App Store AND Google Play store assets for a mobile app in one pass:
  frostie drives the goldie toolkit for the iOS side (argent flows on a
  simulator, framed screenshots, plain preview video, local studio) and adds
  the Google Play layer goldie lacks — 1080×1920 phone screenshots rendered
  from the same captures and design, plus the mandatory 1024×500 feature
  graphic and a Play-rules checklist. Use it whenever the user asks for store
  screenshots, marketing assets, Google Play assets, a feature graphic, an app
  preview video, or mentions frostie or goldie — even for "make screenshots
  for the store". Also for follow-ups: new headlines, different background,
  reordering screenshots, regenerating the Play set. Run from the app's repo.
---

# frostie: App Store + Google Play assets for the app in this repo

frostie is a superset of the goldie workflow. Everything goldie does — argent
flow capture on an iOS simulator, framed screenshots, the plain preview
video, the React studio at http://localhost:4321 — happens exactly as in the
goldie skill, and frostie adds a Google Play stage on top: the same captures
and the same studio design are re-rendered to Play's specs, so both stores
stay visually in sync from one config, one set of flows, one design.

The end state: 4–5 framed App Store screenshots + preview clips (studio at
http://localhost:4321), AND `out/screenshots/play/<locale>/` at 1080×1920
with `out/play/feature-graphic.jpg`, upload-ready for the Play Console.

## Stage 1 — iOS / App Store (delegate to goldie)

Follow the **goldie skill end to end** — it is the source of truth for:
existing-setup detection (`goldie/goldie.config.ts`, `.argent/flows/`),
gathering app facts, exploring the app over argent MCP, authoring scenes and
flows, `doctor → capture → frame → manifest`, the studio, the lazy `preview`
render, `verify`, and the whole iteration table. Every command is
`GOLDIE_CONFIG=<app-repo>/goldie/goldie.config.ts npx -y goldie@0 <cmd>`.

Nothing in frostie changes that stage. Do it first; the Play stage feeds on
its outputs (`out/raw/`, `goldie.design.json`, the config's `store` block).

## frostie studio — one studio for BOTH stores

frostie ships its own studio (instead of goldie's iOS-only one). It shows the
App Store product page and the Google Play listing side by side (tabs), with a
single Design panel — background, font, template, layout, per-tile headlines,
App Store screen-only toggle, Play bezel toggle. "Zastosuj i wyrenderuj"
writes `goldie.design.json` (the same sidecar goldie reads) and re-renders
BOTH stores server-side in a few seconds — WYSIWYG without a build step.

```bash
GOLDIE_CONFIG=<app-repo>/goldie/goldie.config.ts \
  node <this-skill-dir>/scripts/studio.mjs   # background task; http://localhost:4322
```

Start it in the background and tell the user the URL. It needs `out/raw/`
from a prior `goldie capture`. Prefer it over goldie's studio; fall back to
goldie's studio only for features frostie's lacks (drag-reorder, export zip).

## Stage 2 — Google Play (frostie's own layer, CLI path)

Run after capture (and ideally after the user is happy with the studio look,
since the Play render reuses `goldie.design.json`):

```bash
GOLDIE_CONFIG=<app-repo>/goldie/goldie.config.ts \
  node <this-skill-dir>/scripts/play-export.mjs
```

`<this-skill-dir>` is the directory of this SKILL.md. What it does and why:

- **Phone screenshots 1080×1920 (9:16 portrait)** into
  `out/screenshots/play/<locale>/`. Play accepts 320–3840 px, but only sets
  with **≥4 screenshots at ≥1080 px** qualify for the large recommendation
  formats — so frostie renders full-quality 1080×1920 and warns when the set
  has fewer than 4. Same scenes, same layout template, same background and
  copy as the App Store strip; only the canvas differs.
- **Screen-only by default.** Play listings should not showcase Apple
  hardware; the default drops the iPhone bezel and renders the rounded
  screen with goldie's drop shadow. `--bezel` keeps the bezel if the user
  insists.
- **Feature graphic `out/play/feature-graphic.jpg`** — exactly 1024×500,
  JPEG (Play rejects PNGs with an alpha channel). Composed from the theme
  background gradient, the app name + subtitle from the config's `store`
  block in the theme font, and the first raw capture in a rounded window
  bleeding off the bottom edge. It is **mandatory** for every Play listing
  and is what Play shows in promotions and above the fold.
- **Checklist output.** The script ends with a Play-rules report: screenshot
  counts per locale and promotion eligibility, the feature graphic path, a
  reminder that the 512×512 32-bit PNG icon is not generated, and that Play
  takes the preview video **only as a YouTube link** (upload
  `out/previews/**/preview.mp4` as public/unlisted with ads disabled).

Report the checklist verbatim to the user, plus where each asset landed.

### Play iteration

| The user asks for | Do |
|---|---|
| Restyle the Play set (background, font, layout) | change it in the studio / config as in goldie's table, re-run `frame` if you want the iOS set updated too, then re-run `play-export.mjs` |
| Play screenshots with the device bezel | `play-export.mjs --bezel` |
| Different feature graphic text | edit `store.name` / `store.subtitle` in the config, re-run `play-export.mjs` |
| Another locale | add it in `locales` + copy records, `capture`, then `play-export.mjs` |
| Tablet screenshots (7"/10") | out of scope for now — Play only requires them when you opt into tablet distribution; tell the user |

## Notes

- The Play render needs `out/raw/<device>/` from goldie's `capture`; run
  Stage 1 first.
- The script self-installs its copy of the goldie engine into
  `~/.cache/frostie/` on first run (npm), so first invocation takes a minute.
- Web apps captured through Safari/PWA (the mijagi pattern) work the same —
  the raw captures are the input, their origin does not matter.
