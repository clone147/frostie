# frostie ❄️

A Claude Code plugin that produces **App Store and Google Play store assets in one
pass** — a standalone superset of the [goldie](https://github.com/kacperkapusciak/goldie)
workflow (goldie's MIT-licensed npm package is used internally as the rendering engine).

## What it does

- **iOS / App Store**: explores your app on a simulator over [argent](https://github.com/software-mansion/argent)
  (bundled MCP server), replays argent YAML flows, captures raw screens and clips, and
  renders framed screenshots + a plain app-preview video (`npx goldie@0` engine).
- **Google Play**: re-renders the *same* captures and design at Play's specs —
  **1080×1920** phone screenshots (≥4 qualify for large recommendation formats) and the
  mandatory **1024×500 feature graphic** (JPEG; Play rejects alpha PNGs). Screen-only by
  default — no Apple hardware on a Play listing.
- **Dual-store live studio** (`http://localhost:4322`): the App Store product page and
  the Play listing side by side, edited together. Background, font, template, global and
  per-tile layout, tile order (↑/↓), bezel variant, screen-only / Play-bezel toggles and
  per-tile headlines — every change auto-saves the shared `goldie.design.json` and
  re-renders **both** stores server-side in about a second. Plus an Apple + Play rules
  verification panel and a one-click **upload-ready ZIP export** of both stores' assets.

One config (`goldie/goldie.config.ts`), one set of flows (`.argent/flows/`), one design —
any existing goldie project works with frostie unchanged.

## Install

As a Claude Code plugin (bundles the argent MCP server):

```
/plugin marketplace add clone147/frostie
/plugin install frostie@frostie
```

Or as a plain user skill: clone into `~/.claude/skills/frostie/` (argent must then be
available separately). Requirements: macOS with Xcode simulators, Node 20+, `ffmpeg`.

## Usage

Say "make store screenshots" (or `/frostie`) inside the app's repo — Claude drives the
whole pipeline. By hand:

```bash
export GOLDIE_CONFIG=<app-repo>/goldie/goldie.config.ts
npx -y goldie@0 doctor && npx -y goldie@0 capture && npx -y goldie@0 frame
node scripts/play-export.mjs      # Google Play set + feature graphic (+ --bezel)
node scripts/studio.mjs           # dual-store live studio → http://localhost:4322
npx -y goldie@0 preview           # 15–30 s App Store preview video
```

Outputs: `out/screenshots/<device>/`, `out/screenshots/play/<locale>/`,
`out/play/feature-graphic.jpg`, `out/previews/**/preview.mp4`, and
`out/frostie-export.zip` from the studio's Export button.

Docs: `skills/frostie/SKILL.md` (full workflow), `skills/frostie/references/config.md`
(config schema), `skills/frostie/references/flows.md` (flow YAML).

## License

MIT. Rendering engine: [goldie](https://github.com/kacperkapusciak/goldie) (MIT) by
Kacper Kapuściak, used as a pinned npm dependency.
