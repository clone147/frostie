import { type DeviceKey } from "./specs.ts";
/** Newest-runtime simulator matching the device spec's name. */
export declare function resolveUdid(key: DeviceKey): Promise<string>;
export declare function boot(udid: string): Promise<void>;
export declare function shutdown(udid: string): Promise<void>;
export declare function pinKeyboardAndLocale(udid: string, locale: string): Promise<void>;
/**
 * Pin the status bar to Apple's marketing state.
 * argent pins it only during snapshot runs and exposes no tool for it, so this
 * shells out to simctl directly. Must run after boot.
 */
export declare function pinStatusBar(udid: string): Promise<void>;
export declare function clearStatusBar(udid: string): Promise<void>;
export declare function setAppearance(udid: string, appearance: "light" | "dark"): Promise<void>;
/**
 * Bring the device to a known state, reusing the running simulator when it is
 * already in one. A reboot is only worth its cost when the preference store
 * needs rewriting: preferences are read at process start, so a booted device
 * whose keyboard and locale are already pinned needs nothing but the appearance
 * and status bar applied. Rebooting also drops argent's transport session, so
 * an unnecessary one costs a tool-server restart on top of the boot itself.
 */
export declare function prepare(udid: string, locale: string, appearance: "light" | "dark"): Promise<void>;
export declare function warmUp(udid: string, bundleId: string): Promise<void>;
export declare function installApp(udid: string, appPath: string, bundleId: string): Promise<void>;
