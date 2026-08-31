/**
 * Typefaces bundled in assets/fonts/ (Google Fonts, OFL). Each one ships a
 * regular and a bold cut; the renderer registers them with the canvas and
 * the studio declares matching @font-face rules, so a bundled font looks
 * the same in the browser and in the exported PNGs. `theme.fontFamily` stays
 * a plain CSS string: system fonts keep working, and `fontStack()` builds the
 * value for a bundled one.
 */
export type BundledFont = {
    /** CSS family name, as registered with the canvas and declared in @font-face. */
    family: string;
    /** Generic fallbacks appended after the family. */
    fallback: string;
    /** Font files under assets/fonts/, keyed by weight. */
    files: Record<number, string>;
};
export declare const FONTS: {
    readonly merriweather: {
        readonly family: "Merriweather";
        readonly fallback: "Georgia, serif";
        readonly files: {
            readonly 400: "Merriweather-400.ttf";
            readonly 700: "Merriweather-700.ttf";
        };
    };
    readonly "dm-mono": {
        readonly family: "DM Mono";
        readonly fallback: "ui-monospace, Menlo, monospace";
        readonly files: {
            readonly 400: "DMMono-400.ttf";
            readonly 500: "DMMono-500.ttf";
        };
    };
    readonly lato: {
        readonly family: "Lato";
        readonly fallback: "system-ui, sans-serif";
        readonly files: {
            readonly 400: "Lato-400.ttf";
            readonly 700: "Lato-700.ttf";
        };
    };
    readonly "dm-sans": {
        readonly family: "DM Sans";
        readonly fallback: "system-ui, sans-serif";
        readonly files: {
            readonly 400: "DMSans-400.ttf";
            readonly 700: "DMSans-700.ttf";
        };
    };
    readonly montserrat: {
        readonly family: "Montserrat";
        readonly fallback: "system-ui, sans-serif";
        readonly files: {
            readonly 400: "Montserrat-400.ttf";
            readonly 700: "Montserrat-700.ttf";
        };
    };
};
export type FontKey = keyof typeof FONTS;
export declare const FONT_KEYS: FontKey[];
/** The system font: what the example config uses and what `--font system` restores. */
export declare const SYSTEM_FONT = "-apple-system, \"SF Pro Display\", system-ui, sans-serif";
export declare function fontFilePath(file: string): string;
/** The `theme.fontFamily` value for a bundled font, or the system stack for "system". */
export declare function fontStack(key: string): string;
/** Makes every bundled font available to the canvas. Safe to call repeatedly. */
export declare function registerFonts(): void;
