import type { ExitLayoutMode, Rect } from "./transitionTypes.ts";
export type PreparedExitState = {
    layoutMode: ExitLayoutMode;
    restore(node: Element): void;
};
export declare function prepareNodeForExit(node: Element, rect: Rect, layoutMode: ExitLayoutMode): PreparedExitState;
export declare function restorePreparedExitNode(node: Element, preparedExit: PreparedExitState): void;
