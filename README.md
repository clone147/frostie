# frostie ❄️

A Claude Code skill that produces **App Store and Google Play store assets in one pass**.

frostie is a superset of the excellent [goldie](https://github.com/kacperkapusciak/goldie)
workflow: goldie handles the iOS side (argent flows replayed on a simulator, framed
screenshots, a plain app-preview video, a local WYSIWYG studio), and frostie adds the
Google Play layer goldie lacks:

- **Phone screenshots 1080×1920** (9:16 portrait) rendered from the *same* captures,
  layouts, background and copy as your App Store strip — both stores stay in sync from
  one config, one set of flows, one design.
- **Feature graphic 1024×500** (mandatory on Play) — composed from your theme
  background, app name + subtitle in the theme font, and a live capture bleeding off
  the edge. Exported as JPEG (Play rejects PNGs with an alpha channel).
- **Screen-only by default** — no Apple hardware bezels on a Google Play listing
  (pass `--bezel` if you insist).
- **A Play-rules checklist** — screenshot counts and promotion eligibility (≥4 shots
  at ≥1080 px), reminders about the 512×512 icon and the YouTube-only preview video.

## Install

Copy this directory to `~/.claude/skills/frostie/` (or add it as a plugin skill).
Claude Code picks it up automatically; say "make store screenshots" or "/frostie".

## Usage

Stage 1 (iOS) is the goldie skill, unchanged. Stage 2:

```bash
GOLDIE_CONFIG=<app-repo>/goldie/goldie.config.ts \
  node scripts/play-export.mjs          # add --bezel to keep the device frame
```

Outputs land next to goldie's: `out/screenshots/play/<locale>/*.png` and
`out/play/feature-graphic.jpg`.

## Requirements

Node 20+, ffmpeg, and a goldie project with captures (`goldie capture` run at least
once). The script self-installs its copy of the goldie engine into `~/.cache/frostie/`
on first run.

## License

MIT
