import type { EnterTransitionContext, ExitTransitionContext, MoveGeometry, MoveTransitionContext, RelativePoint, TransitionEffect } from "./transitionTypes.ts";
type ValueKeyframe<T> = {
    offset: number;
    value: T;
};
type ScaleValue = number | MoveGeometry["scale"];
type BlurValue = number | string;
type EnterOrExitContext = EnterTransitionContext | ExitTransitionContext;
type PhaseName = "enter" | "exit" | "move";
type PhaseAwareEffect<Ctx, AllowedPhase extends PhaseName> = TransitionEffect<Ctx> & {
    debugName?: string;
    phases: readonly AllowedPhase[];
};
export type FadeEffectOptions = {
    value?: number;
    keyframes?: ValueKeyframe<number>[];
};
export type ScaleEffectOptions = {
    value?: ScaleValue;
    origin?: string;
    keyframes?: ValueKeyframe<ScaleValue>[];
};
export type BlurEffectOptions = {
    value?: BlurValue;
    keyframes?: ValueKeyframe<BlurValue>[];
};
export type TranslateEffectOptions = {
    value?: RelativePoint;
    keyframes?: ValueKeyframe<RelativePoint>[];
};
export type FlipEffectOptions = {
    scale?: boolean;
    origin?: string;
};
export type EnterEffect = PhaseAwareEffect<EnterOrExitContext, "enter" | "exit">;
export type ExitEffect = PhaseAwareEffect<EnterOrExitContext, "enter" | "exit">;
export type MoveEffect = PhaseAwareEffect<MoveTransitionContext, "move">;
export declare function fade(value?: number): EnterEffect;
export declare function fade(options: FadeEffectOptions): EnterEffect;
export declare function scale(value?: ScaleValue): EnterEffect;
export declare function scale(options: ScaleEffectOptions): EnterEffect;
export declare function blur(value?: BlurValue): EnterEffect;
export declare function blur(options: BlurEffectOptions): EnterEffect;
export declare function translate(value: RelativePoint): EnterEffect;
export declare function translate(options: TranslateEffectOptions): EnterEffect;
export declare function flip(options?: FlipEffectOptions): MoveEffect;
export declare const effects: {
    readonly fade: typeof fade;
    readonly scale: typeof scale;
    readonly blur: typeof blur;
    readonly translate: typeof translate;
    readonly flip: typeof flip;
};
export {};
