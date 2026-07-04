import { type ComponentProps, type ComponentPropsWithoutRef, type ElementType, type FC, type ForwardedRef, type ReactElement, type ReactNode } from "react";
import { type ExitLayoutMode, type TransitionPlugin } from "./transitionTypes.ts";
export { buildEnterContext, buildExitContext, buildMoveContext, type EffectFilter, type EffectFrame, type EffectTransform, getMoveGeometry, getScaleFactor, type Dimensions, type CompiledTransitionPlugin, type ExitLayoutMode, type EnterTransitionContext, type ExitTransitionContext, type LengthPercentage, type MoveGeometry, type MoveTransitionContext, type ParentBounds, type Percentage, type Point, type Rect, type RelativePoint, type TransitionBaseContext, type TransitionEffect, type TransitionPhaseDefinition, type TransitionPhaseHandler, type TransitionPhaseLike, type TransitionPlugin, type TransitionTiming, } from "./transitionTypes.ts";
export { defaultEnterTransition, defaultExitTransition, defaultMoveTransition, effects, preset, type PresetSpec, } from "./preset.ts";
export { defineTransition } from "./transitionPresets.ts";
export type { BlurEffectOptions, EnterEffect, ExitEffect, FadeEffectOptions, FlipEffectOptions, MoveEffect, ScaleEffectOptions, TranslateEffectOptions, } from "./effects.ts";
/**
 * Common props for `AutoTransition`.
 *
 * @template T - Element type to render as (e.g., "div", "ul").
 */
type AutoTransitionBaseProps<T extends ElementType | undefined> = {
    as?: T;
    transition?: TransitionPlugin;
    exitLayout?: ExitLayoutMode;
    patch?: boolean;
    ref?: ForwardedRef<HTMLElement>;
};
export type AutoTransitionProps<T extends ElementType | undefined> = T extends ElementType ? AutoTransitionBaseProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof AutoTransitionBaseProps<T>> & {
    children?: ReactNode;
} : AutoTransitionBaseProps<T> & {
    children: ReactElement;
};
/**
 * AutoTransition
 *
 * A small container component that provides automatic enter/exit/move
 * animations for its child `Element` nodes. The component intercepts
 * low-level DOM operations (`appendChild`, `insertBefore`, `removeChild`)
 * performed on the container and plays animations (via the Web Animations
 * API) before applying DOM changes such as removing an element.
 *
 * If a `transition` plugin is not provided, AutoTransition applies its
 * default animations:
 *  - enter: fade in (opacity 0 -> 1), 250ms ease-out
 *  - exit: keep element size and position while fading out, 250ms ease-in
 *  - move: translate + scale from previous rect to new rect, 250ms ease-in
 *
 * The default enter/exit animations do not apply scale. Use the declarative
 * `preset()` API when you want to add effects such as scale, blur, or translate.
 *
 * Notes:
 *  - This component is client-only (relies on DOM measurement & Web Animations API).
 *  - It only animates `Element` nodes; text nodes use native DOM operations.
 *  - In exit path, the provided animation's finish triggers removal from the DOM.
 *
 * Example usage:
 * ```tsx
 * <AutoTransition as="div" className="grid gap-2">
 *   {items.map((it) => (
 *     <Card key={it.id}>{it.title}</Card>
 *   ))}
 * </AutoTransition>
 *
 * // with custom transition plugin
 * <AutoTransition transition={FloatingPanelTransition} as="div">
 *   {isOpen && <PanelContent />}
 * </AutoTransition>
 * ```
 *
 * @template T - Element type to render as (e.g. "div")
 * @param props - props as defined by `AutoTransitionProps<T>`
 */
export declare function AutoTransition<T extends ElementType | undefined>({ as, children, transition, exitLayout, ref: externalRef, patch, ...rest }: AutoTransitionProps<T>): any;
/**
 * A higher-order component that wraps a component with `AutoTransition`.
 *
 * @template T - Element type of the component to wrap.
 * @param Component - The component to wrap.
 * @param options - Default props to pass to `AutoTransition`.
 * @returns A new component that automatically applies transitions.
 */
export declare function withAutoTransition<T extends ElementType, R extends ElementType>(Component: T, options?: Omit<AutoTransitionProps<R>, "children">): FC<ComponentProps<T>>;
