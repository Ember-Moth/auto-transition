/**
 * A rectangle describing an element's position and size relative to the measured
 * parent used by `AutoTransition` for layout calculations.
 *
 * - `x`/`y` are the left/top offsets relative to the measurement parent's content box.
 * - `width`/`height` are the element's layout size in pixels.
 */
export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/**
 * Simple size pair used for resize transitions (width/height in pixels).
 */
export type Dimensions = {
    width: number;
    height: number;
};
export type Point = {
    x: number;
    y: number;
};
export type Percentage = `${number}%`;
export type LengthPercentage = number | Percentage;
export type RelativePoint = {
    x: LengthPercentage;
    y: LengthPercentage;
};
export type ExitLayoutMode = "absolute" | "flow";
export type ParentBounds = {
    width: number;
    height: number;
};
export type MoveGeometry = {
    delta: Point;
    scale: {
        x: number;
        y: number;
    };
};
export type TransitionBaseContext = {
    element: Element;
    parent: ParentBounds;
};
export type EnterTransitionContext = TransitionBaseContext & {
    rect: Rect;
};
export type ExitTransitionContext = TransitionBaseContext & {
    rect: Rect;
    viewportRect: Rect;
    anchorDelta: Point;
    layoutMode: ExitLayoutMode;
};
export type MoveTransitionContext = TransitionBaseContext & {
    current: Rect;
    previous: Rect;
    delta: Point;
    anchorDelta: Point;
    scale: MoveGeometry["scale"];
};
export type TransitionPhaseHandler<Ctx> = (ctx: Ctx) => Animation;
export type TransitionTiming<Ctx> = KeyframeAnimationOptions | ((ctx: Ctx) => KeyframeAnimationOptions);
export type EffectTransform = {
    translate?: Point;
    scale?: MoveGeometry["scale"];
};
export type EffectFilter = {
    blur?: string;
};
export type EffectFrame = {
    offset: number;
    opacity?: number;
    transform?: EffectTransform;
    filter?: EffectFilter;
    transformOrigin?: string;
    style?: Partial<Keyframe>;
};
export type TransitionEffect<Ctx> = {
    build(ctx: Ctx): EffectFrame[];
};
export type TransitionPhaseDefinition<Ctx> = {
    effects: TransitionEffect<Ctx>[];
    options?: TransitionTiming<Ctx>;
};
export type TransitionPhaseLike<Ctx> = TransitionPhaseHandler<Ctx> | TransitionPhaseDefinition<Ctx>;
export type TransitionPlugin = {
    enter?: TransitionPhaseLike<EnterTransitionContext>;
    exit?: TransitionPhaseLike<ExitTransitionContext>;
    move?: TransitionPhaseLike<MoveTransitionContext>;
};
export type CompiledTransitionPlugin = {
    enter?: TransitionPhaseHandler<EnterTransitionContext>;
    exit?: TransitionPhaseHandler<ExitTransitionContext>;
    move?: TransitionPhaseHandler<MoveTransitionContext>;
};
export declare function buildEnterContext(element: Element, rect: Rect, parent: ParentBounds): EnterTransitionContext;
export declare function buildExitContext(element: Element, rect: Rect, parent: ParentBounds, options?: {
    viewportRect?: Rect;
    anchorDelta?: Point;
    layoutMode?: ExitLayoutMode;
}): ExitTransitionContext;
export declare function buildMoveContext(element: Element, current: Rect, previous: Rect, parent: ParentBounds, options?: {
    anchorDelta?: Point;
}): MoveTransitionContext;
export declare function getScaleFactor(previous: number, current: number): number;
export declare function getMoveGeometry(current: Rect, previous: Rect): MoveGeometry;
