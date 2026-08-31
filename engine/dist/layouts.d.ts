export declare const LAYOUT_KEYS: readonly ["classic", "copy-below", "hero", "offset", "tilt", "tilt-right", "duo", "duo-tilt", "panorama", "panorama-duo", "minimal"];
export type LayoutKey = (typeof LAYOUT_KEYS)[number];
export type CopyAlign = "center" | "left";
export type CopyPosition = "top" | "bottom" | "none";
export type LayoutSpec = {
    key: LayoutKey;
    label: string;
    description: string;
    /** Store tiles this composition covers; a panorama is sliced into `span` PNGs. */
    span: 1 | 2;
    copy: {
        position: CopyPosition;
        align: CopyAlign;
        /**
         * Fraction of the tile height the copy block takes. `classic` reads
         * theme.copyHeightRatio instead so existing configs keep their look.
         */
        heightRatio?: number;
        /** Anchor x as a fraction of the composition width; the default centres it (or sits at padX when left aligned). */
        x?: number;
        /** Wrap width as a fraction of the tile width; the default leaves padX on both sides. */
        widthRatio?: number;
    };
    /** Back to front. One device, or two for the duo layouts (the second reads `secondScene`). */
    devices: DevicePlacement[];
};
export type DevicePlacement = {
    /** Bezel width as a fraction of the tile width. `classic` reads theme.deviceWidthRatio. */
    widthRatio: number;
    /** Device centre as fractions of the composition width and tile height. */
    x: number;
    y: number;
    /** Degrees, clockwise, around the device centre. */
    rotate: number;
    capture: "primary" | "secondary";
    /**
     * The classic fit: shrink the device so it also fits between the copy block
     * and the bottom margin, then centre it in that band (y is ignored).
     */
    fitBelowCopy?: boolean;
};
/** Type and spacing as fractions of the tile width (sizes, padX) or tile height (padTop, gap). */
export declare const TYPE: {
    readonly headlineSize: 0.082;
    readonly headlineLineHeight: 1.08;
    readonly headlineTracking: -0.0016;
    readonly headlineWeight: 700;
    readonly subheadSize: 0.038;
    readonly subheadLineHeight: 1.3;
    readonly subheadWeight: 400;
    readonly padX: 0.09;
    readonly padTop: 0.055;
    readonly padBottom: 0.05;
    readonly gap: 0.014;
};
/** Badge pill geometry as fractions of the tile width (all but `inset`, of the shorter tile side). */
export declare const BADGE: {
    readonly fontSize: 0.03;
    readonly weight: 700;
    readonly padX: 0.028;
    readonly padY: 0.014;
    readonly inset: 0.045;
};
/** Space left under the device in the classic fit, as a fraction of the tile height. */
export declare const CLASSIC_BOTTOM_MARGIN = 0.03;
/** Drop shadow under a bare screen, as fractions of the tile width. */
export declare const SCREEN_SHADOW: {
    readonly blur: 0.06;
    readonly offsetY: 0.02;
    readonly color: "rgba(0, 0, 0, 0.28)";
};
export declare const LAYOUTS: Record<LayoutKey, LayoutSpec>;
export declare function isLayoutKey(key: string): key is LayoutKey;
/**
 * A template is the rhythm of a whole strip: the layout each screenshot
 * scene takes, in store order. A sequence shorter than the scene list
 * repeats from its start. Built-ins below; a config can give its own
 * sequence as an array of layout keys.
 */
export declare const TEMPLATE_KEYS: readonly ["uniform", "editorial", "showcase", "magazine", "storyboard", "dynamic"];
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export type TemplateSpec = {
    key: TemplateKey;
    label: string;
    description: string;
    sequence: LayoutKey[];
};
export declare const TEMPLATES: Record<TemplateKey, TemplateSpec>;
export declare function isTemplateKey(key: string): key is TemplateKey;
/** A template choice: a built-in key, or a custom sequence of layout keys. */
export type TemplateChoice = TemplateKey | LayoutKey[];
export declare function templateSequence(choice: TemplateChoice | undefined): LayoutKey[];
/**
 * The layout each screenshot scene renders with, and where a two-screen
 * layout finds its second capture. Precedence: the scene's own `layout`,
 * then the template's entry for its position, then the theme layout, then
 * classic. A two-screen layout without a `secondScene` borrows the next
 * scene's capture (wrapping), so templates work on any config.
 */
export declare function resolveScenes<S extends {
    id: string;
    layout?: string;
    secondScene?: string;
}>(scenes: S[], opts: {
    template?: TemplateChoice;
    layout?: string;
    sceneLayouts?: Record<string, string>;
}): Array<{
    scene: S;
    layout: LayoutSpec;
    secondScene: string | undefined;
}>;
export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};
export type Composition = {
    /** span × tile width, and the tile height. */
    width: number;
    height: number;
    copy: {
        position: "top" | "bottom";
        align: CopyAlign;
        /** Anchor x: the centre line when centred, the left edge when left aligned. */
        x: number;
        /** Top of the block when `position` is "top", its bottom edge when "bottom". */
        y: number;
        maxWidth: number;
        /** The block's box, for the DOM twin. */
        box: Rect;
    } | null;
    devices: Array<{
        frame: Rect;
        screen: Rect & {
            radius: number;
        };
        rotate: number;
        capture: "primary" | "secondary";
    }>;
};
/**
 * Pixel geometry for a layout on a tile of the given size. `screenOnly`
 * drops the bezel: the device box becomes the bare screen cutout.
 */
export declare function compose(spec: LayoutSpec, tile: {
    width: number;
    height: number;
}, theme: {
    copyHeightRatio: number;
    deviceWidthRatio: number;
}, opts?: {
    screenOnly?: boolean;
}): Composition;
/** Whether a layout draws a second capture, which needs the scene's `secondScene`. */
export declare function needsSecondCapture(spec: LayoutSpec): boolean;
