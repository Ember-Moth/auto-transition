import { effects, type EnterEffect, type ExitEffect, type MoveEffect } from "./effects.ts";
import type { EnterTransitionContext, ExitTransitionContext, MoveTransitionContext, TransitionPlugin, TransitionTiming } from "./transitionTypes.ts";
type OneOrMany<T> = T | T[];
export type PresetSpec = {
    enter?: OneOrMany<EnterEffect>;
    exit?: OneOrMany<ExitEffect>;
    move?: MoveEffect;
    timing?: {
        enter?: TransitionTiming<EnterTransitionContext>;
        exit?: TransitionTiming<ExitTransitionContext>;
        move?: TransitionTiming<MoveTransitionContext>;
    };
};
export declare function preset(spec: PresetSpec): TransitionPlugin;
export declare function defaultEnterTransition(ctx: EnterTransitionContext): Animation;
export declare function defaultExitTransition(ctx: ExitTransitionContext): Animation;
export declare function defaultMoveTransition(ctx: MoveTransitionContext): Animation;
export { effects };
