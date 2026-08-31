/**
 * App Store Connect asset specifications.
 * Source: developer.apple.com/help/app-store-connect/reference/
 *   screenshot-specifications  |  app-preview-specifications
 * Verified 2026-08-24.
 */
export type DeviceKey = "iphone-6.9";
export type DeviceSpec = {
    /** Human label used in output paths and logs. */
    label: string;
    /** `xcrun simctl` device type name; the toolkit picks the newest runtime that has it. */
    simulatorName: string;
    /** Native capture resolution of that simulator, portrait. */
    native: {
        width: number;
        height: number;
    };
    /** Required screenshot upload size, portrait. */
    screenshot: {
        width: number;
        height: number;
    };
    /** Required app preview upload size, portrait. */
    preview: {
        width: number;
        height: number;
    };
};
export declare const DEVICES: Record<DeviceKey, DeviceSpec>;
/** Preview constraints Apple enforces at upload time. */
export declare const PREVIEW: {
    readonly fps: 30;
    readonly minSeconds: 15;
    readonly maxSeconds: 30;
    /** Apple asks for 10-12 Mbps VBR on H.264. */
    readonly videoBitrate: "11M";
    readonly audioBitrate: "256k";
    readonly audioSampleRate: 48000;
    readonly maxBytes: number;
};
/** Screenshots may not carry an alpha channel. */
export declare const SCREENSHOT_PIXEL_FORMAT = "rgb24";
