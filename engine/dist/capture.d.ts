import { type LoadedConfig } from "./config.ts";
import { type DeviceKey } from "./specs.ts";
/** What `frame`/`preview` read. Written to out/raw/<device>/manifest.json. */
export type CaptureManifest = {
    device: DeviceKey;
    udid: string;
    capturedAt: string;
    screenshots: Array<{
        sceneId: string;
        file: string;
    }>;
    preview: {
        sceneId: string;
        clips: Array<{
            segmentId: string;
            file: string;
            durationSeconds: number;
        }>;
    } | null;
};
export declare function capture(cfg: LoadedConfig, deviceKey: DeviceKey): Promise<CaptureManifest>;
