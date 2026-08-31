import { type SKRSContext2D } from "@napi-rs/canvas";
import { type LoadedConfig } from "./config.ts";
import { type DeviceKey } from "./specs.ts";
/**
 * Composites each raw screenshot into its layout on the theme background:
 * copy, decorations, then the device(s), bezel on top. Drawn with a 2D
 * canvas from the geometry compose() returns, the same call the studio's
 * ScreenshotScene makes, so the export is what the browser showed. A
 * panorama layout draws once at span × width and is sliced into store-sized
 * tiles.
 */
export declare function renderScreenshots(cfg: LoadedConfig, deviceKey: DeviceKey, locale: string): Promise<string[]>;
/** Word-wraps text to `maxWidth`, honouring explicit newlines. */
export declare function wrapLines(ctx: SKRSContext2D, text: string, font: string, letterSpacing: number, maxWidth: number): string[];
/**
 * Joins the raw segment clips into one plain screen recording at the upload
 * size. App Store previews must be the device screen and nothing else, so no
 * bezel, background or captions are added; only an audio track, which Apple
 * requires even when it is silent.
 */
export declare function renderPreview(cfg: LoadedConfig, deviceKey: DeviceKey, locale: string): Promise<string | null>;
/** Compares finished assets against the Apple spec table and prints a report. */
export declare function verify(cfg: LoadedConfig, deviceKey: DeviceKey, locale: string): Promise<boolean>;
