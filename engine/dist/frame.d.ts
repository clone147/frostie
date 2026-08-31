/**
 * Geometry of the bezel PNGs in assets/ (the 17-pro-* variants): the bezel
 * image and the transparent screen cutout inside it, both in the source PNG's
 * own pixels. All bundled variants share this geometry. Measured from the
 * alpha channel; re-measure if custom bezel art is used instead. Layouts built on it live
 * in layouts.ts.
 */
export declare const FRAME: {
    readonly width: 606;
    readonly height: 1252;
    readonly screen: {
        readonly x: 24;
        readonly y: 21;
        readonly width: 557;
        readonly height: 1210;
    };
    /**
     * Corner radius of the screen cutout. The bezel ring is thinner than this
     * radius, so square screen content would poke past the phone's outer corner;
     * the compositor clips the content with the scaled radius instead.
     */
    readonly screenRadius: 82;
};
