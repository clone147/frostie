export type ExecResult = {
    code: number;
    stdout: string;
    stderr: string;
};
export declare function exec(cmd: string, args: string[], opts?: {
    cwd?: string;
    quiet?: boolean;
}): Promise<ExecResult>;
export declare function execOrThrow(cmd: string, args: string[], opts?: {
    cwd?: string;
    quiet?: boolean;
}): Promise<ExecResult>;
/** First JSON value in a stream that may be prefixed with human-readable log lines. */
export declare function parseJsonTail<T = unknown>(out: string): T | null;
