import { type Decoration, type LoadedConfig, type Theme } from "./config.ts";
import { type DeviceKey } from "./specs.ts";
/**
 * `out/web/` - the studio's static root. It holds the manifest, the
 * bezel art, and symlinks to the finished assets and the raw
 * captures. The raw captures and bezels are what the studio composites in
 * the browser (instant background/frame changes); the finished files under
 * screenshots/ and previews/ are what an export zips up.
 *
 * The `design` section carries everything the browser-side composition needs:
 * the theme, each scene's copy, and per-device raw capture urls. `assets`
 * still records the finished files so tooling can see what was last rendered.
 */
export type StoreManifest = {
    generatedAt: string;
    app: {
        name: string;
        subtitle: Record<string, string>;
        developer: string;
        category: string;
        rating: number;
        ratingCount: string;
        ageRating: string;
        price: string;
        description: Record<string, string>;
    };
    devices: Array<{
        key: DeviceKey;
        label: string;
        simulatorName: string;
        screenshot: {
            width: number;
            height: number;
        };
        preview: {
            width: number;
            height: number;
        };
    }>;
    locales: string[];
    /** Keyed by device key, then locale. */
    assets: Record<string, Record<string, LocaleAssets>>;
    /** Everything the studio needs to composite scenes in the browser. */
    design: {
        theme: Theme;
        /** null when the config points at custom bezel art. */
        frameVariant: string | null;
        frameVariants: string[];
        /** Url of the config's custom bezel art; null when a bundled variant is used. */
        customFrameUrl: string | null;
        /** Bundled typefaces, with the @font-face sources the studio declares. */
        fonts: Array<{
            key: string;
            family: string;
            fallback: string;
            faces: Array<{
                weight: number;
                url: string;
            }>;
        }>;
        /** Every layout the studio can pick, in menu order. */
        layouts: Array<{
            key: string;
            label: string;
            description: string;
            span: number;
        }>;
        templates: Array<{
            key: string;
            label: string;
            description: string;
            sequence: string[];
        }>;
        /** The theme's template: a built-in key, null for none, or the config's custom sequence. */
        template: string | string[] | null;
        /** The theme's default layout key. */
        layout: string;
        screenOnly: boolean;
        /** Theme-level decorations; image `src` values are urls under out/web. */
        decorations: Decoration[];
        scenes: Array<{
            id: string;
            headline: Record<string, string>;
            subhead?: Record<string, string>;
            layout?: string;
            secondScene?: string;
            decorations?: Decoration[];
        }>;
        preview: {
            sceneId: string;
            segments: Array<{
                id: string;
            }>;
        } | null;
        /** Raw capture urls per device key; a device is absent until `goldie capture` ran. */
        captures: Record<string, {
            screenshots: Array<{
                sceneId: string;
                url: string;
            }>;
            clips: Array<{
                segmentId: string;
                url: string;
                durationSeconds: number;
            }> | null;
        }>;
    };
};
export type LocaleAssets = {
    screenshots: Array<{
        sceneId: string;
        url: string;
        width: number;
        height: number;
        bytes: number;
    }>;
    preview: {
        sceneId: string;
        url: string;
        width: number;
        height: number;
        bytes: number;
        durationSeconds: number;
    } | null;
};
export declare const WEB_DIR = "web";
export declare function writeManifest(cfg: LoadedConfig): Promise<string>;
