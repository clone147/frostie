type Primitive = string | number | boolean;
/** Invoke a tool and return its parsed `data`. */
export declare function run<T = any>(tool: string, args: Record<string, Primitive | undefined>): Promise<T>;
/** Invoke a tool that returns an image/video artifact, writing it to `out`. */
export declare function runToFile(tool: string, args: Record<string, Primitive | undefined>, out: string): Promise<string>;
/** Mirrors argent's StepReport (packages/tool-server/src/tools/flows/flow-run.ts). */
export type FlowStepReport = {
    index?: number;
    kind?: string;
    status?: string;
    /** Machine-readable explanation; always set when the step did not pass. */
    reason?: string;
    warning?: string;
    tool?: string;
    /** Display-only "what this step acts on" - the selector, the snapshot name. */
    target?: string;
    message?: string;
    error?: string;
    [k: string]: unknown;
};
export type FlowReport = {
    ok: boolean;
    raw: unknown;
    steps: FlowStepReport[];
    failed: FlowStepReport | null;
    stdout: string;
};
/** Replay a flow YAML headlessly. Never throws - inspect `ok` / `failed`. */
export declare function flow(pathOrName: string, udid: string): Promise<FlowReport>;
/** Is the argent corner watermark disabled? Previews must not carry it. */
export declare function watermarkDisabled(): Promise<boolean>;
/**
 * Stop the shared tool-server so the next call auto-spawns a fresh one.
 * Needed after a simulator shutdown: the running server keeps a transport
 * session pointed at the device that went away, and every later `launch`
 * then fails its native-devtools handshake.
 */
export declare function restartServer(): Promise<void>;
export declare function available(): Promise<boolean>;
export {};
