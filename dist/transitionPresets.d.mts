import type { CompiledTransitionPlugin, ExitTransitionContext, MoveGeometry, Point, TransitionBaseContext, TransitionEffect, TransitionPhaseDefinition, TransitionPlugin } from "./transitionTypes.ts";
export declare const DEFAULT_TRANSFORM_ORIGIN = "50% 50%";
export declare const DEFAULT_MOVE_TRANSFORM_ORIGIN = "0 0";
type NamedTransitionEffect<Ctx> = TransitionEffect<Ctx> & {
    debugName?: string;
};
export declare function getElementOpacity(element: Element): number;
export declare function toScale(value: number | MoveGeometry["scale"] | undefined, fallback: number): MoveGeometry["scale"];
export declare function addPoints(a: Point, b: Point): Point;
export declare function createTransitionEffect<Ctx>(debugName: string, build: TransitionEffect<Ctx>["build"]): NamedTransitionEffect<Ctx>;
export declare function createTransitionAnimation<Ctx extends TransitionBaseContext>(ctx: Ctx, definition: TransitionPhaseDefinition<Ctx>): Animation;
export declare function createExitLayoutEffect(): TransitionEffect<ExitTransitionContext>;
export declare function defineTransition(transition: TransitionPlugin): CompiledTransitionPlugin;
export declare function normalizeTransition(transition: TransitionPlugin | undefined): CompiledTransitionPlugin | undefined;
export {};
