import type { FlowReport } from "./argent.ts";
/**
 * Flows replay without an LLM. When one breaks - the app moved a button, a
 * label changed - this is the handoff back to a human or to Claude over argent
 * MCP. Nothing repairs itself: the corrected YAML is a reviewed commit.
 */
export declare class FlowFailure extends Error {
    readonly sceneId: string;
    readonly flowPath: string;
    readonly udid: string;
    readonly report: FlowReport;
    constructor(sceneId: string, flowPath: string, udid: string, report: FlowReport);
}
export declare function repairBrief(failure: FlowFailure): string;
