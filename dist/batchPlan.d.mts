type Point = {
    x: number;
    y: number;
};
type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type BatchParentRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};
export type BatchSnapshot<T> = {
    parent: BatchParentRect;
    rects: Map<T, Rect>;
};
export type PendingExitRecord<T> = {
    node: T;
    rect: Rect;
    viewportRect: Rect;
};
export type PlannedMove<T> = {
    node: T;
    current: Rect;
    previous: Rect;
    anchorDelta: Point;
};
export type PlannedEnter<T> = {
    node: T;
    rect: Rect;
};
export type PlannedExit<T> = {
    node: T;
    rect: Rect;
    viewportRect: Rect;
    anchorDelta: Point;
};
export type BatchAnimationPlan<T> = {
    anchorDelta: Point;
    moves: PlannedMove<T>[];
    enters: PlannedEnter<T>[];
    exits: PlannedExit<T>[];
};
export declare function getBatchAnchorDelta(previousParent: Pick<BatchParentRect, "left" | "top">, nextParent: Pick<BatchParentRect, "left" | "top">): Point;
export declare function hasRectChanged(current: Rect, previous: Rect): boolean;
export declare function planBatchAnimations<T>({ before, after, finalNodes, pendingEnters, pendingExits, }: {
    before: BatchSnapshot<T>;
    after: BatchSnapshot<T>;
    finalNodes: readonly T[];
    pendingEnters: ReadonlySet<T>;
    pendingExits: ReadonlyMap<T, PendingExitRecord<T>>;
}): BatchAnimationPlan<T>;
export {};
