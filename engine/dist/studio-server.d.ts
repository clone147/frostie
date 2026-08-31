import { type IncomingMessage, type ServerResponse } from "node:http";
/**
 * The studio's HTTP surface, shared by `goldie studio` (a static server over
 * the prebuilt studio/dist) and the Vite dev server (studio/vite.config.ts).
 *
 * GET/PUT /api/design - the design choices saved next to the config as
 * goldie.design.json ({ background?, frame?, fontFamily?, copy?, order? }).
 * The CLI's loadConfig() applies the file, so a saved choice also shapes plain
 * `goldie frame` runs. The UI debounces its PUTs; the server writes the file
 * atomically so a half-written JSON never reaches the CLI.
 *
 * POST /api/export - renders the final assets from the raw captures with the
 * chosen background and frame (goldie frame + preview + manifest), zips
 * out/screenshots and out/previews, and streams the CLI log as plain text.
 * Body: { background?, frame?, font?, template?, layout?, screenOnly? };
 * per-scene layouts ride on goldie.design.json, which the CLI reads on its
 * own. The response ends with "[done]" on success or "[failed]" otherwise; on
 * "[done]" the UI downloads GET /api/export/download.
 */
export type StudioPaths = {
    configPath: string;
    configDir: string;
    outDir: string;
    webDir: string;
    designFile: string;
    exportZip: string;
};
/** Every path the studio touches derives from the config file's location. */
export declare function studioPaths(configPath: string): StudioPaths;
export type ExportOptions = {
    background?: string;
    frame?: string;
    font?: string;
    template?: string;
    layout?: string;
    screenOnly?: boolean;
};
export type StudioApi = {
    paths: StudioPaths;
    /** Command prefix that runs the goldie CLI, e.g. ["node", ".../dist/cli.js"]. */
    cli: string[];
};
type Handler = (req: IncomingMessage, res: ServerResponse) => void;
/** Handles /api/design. */
export declare function designHandler({ paths }: StudioApi): Handler;
/** Handles /api/export and /api/export/download. `sub` is the path after /api/export. */
export declare function exportHandler({ paths, cli }: StudioApi): (sub: string) => Handler;
/** The studio bundle Vite emits; shipped in the npm package. */
export declare const STUDIO_DIST: string;
/**
 * Serve the prebuilt studio plus the app's out/web at `/`, with the API on top.
 * Resolves with the URL once listening.
 */
export declare function serveStudio(api: StudioApi, port?: number): Promise<string>;
/** Open a URL in the default browser; best effort. */
export declare function openInBrowser(url: string): Promise<void>;
export {};
