// src/AutoTransition.tsx
import { Slot } from "@radix-ui/react-slot";
import {
  useEffect,
  useRef
} from "react";

// src/ActivityPatch.tsx
var observer = typeof window === "object" ? new MutationObserver((entries) => {
  for (const entry of entries) {
    if (entry.type === "childList") {
      entry.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          apply(node);
        }
      });
    }
  }
}) : null;
var applied = /* @__PURE__ */ new WeakSet();
function apply(node) {
  if (applied.has(node)) return;
  if (node.style.display === "none") {
    node.style.display = "";
  }
  const proxied = new Proxy(node.style, {
    get(target, p) {
      if (p === "setProperty")
        return function(...args) {
          if (args[0] === "display" && args[1] === "none" && args[2] === "important") {
            node.inert = true;
            return;
          }
          CSSStyleDeclaration.prototype.setProperty.apply(this, args);
        };
      return Reflect.get(target, p);
    },
    set(target, p, newValue) {
      if (p === "display") {
        node.inert = false;
        return true;
      }
      return Reflect.set(target, p, newValue);
    }
  });
  Object.defineProperty(node, "style", { value: proxied });
  applied.add(node);
}
function patchActivity(element) {
  for (const child of element.children) {
    apply(child);
  }
  observer.observe(element, {
    childList: true
  });
}

// src/batchPlan.ts
function getBatchAnchorDelta(previousParent, nextParent) {
  return {
    x: previousParent.left - nextParent.left,
    y: previousParent.top - nextParent.top
  };
}
function hasRectChanged(current, previous) {
  return current.x !== previous.x || current.y !== previous.y || current.width !== previous.width || current.height !== previous.height;
}
function planBatchAnimations({
  before,
  after,
  finalNodes,
  pendingEnters,
  pendingExits
}) {
  const anchorDelta = getBatchAnchorDelta(before.parent, after.parent);
  const moves = [];
  const enters = [];
  for (const node of finalNodes) {
    const current = after.rects.get(node);
    if (!current) continue;
    const previous = before.rects.get(node);
    if (previous) {
      if (hasRectChanged(current, previous) || anchorDelta.x !== 0 || anchorDelta.y !== 0) {
        moves.push({ node, current, previous, anchorDelta });
      }
      continue;
    }
    if (pendingEnters.has(node)) {
      enters.push({ node, rect: current });
    }
  }
  const exits = [];
  for (const exit of pendingExits.values()) {
    exits.push({
      node: exit.node,
      rect: exit.rect,
      viewportRect: exit.viewportRect,
      anchorDelta
    });
  }
  return { anchorDelta, moves, enters, exits };
}

// src/transitionTypes.ts
function buildEnterContext(element, rect, parent) {
  return { element, rect, parent };
}
function buildExitContext(element, rect, parent, options = {}) {
  return {
    element,
    rect,
    parent,
    viewportRect: options.viewportRect ?? rect,
    anchorDelta: options.anchorDelta ?? { x: 0, y: 0 },
    layoutMode: options.layoutMode ?? "absolute"
  };
}
function buildMoveContext(element, current, previous, parent, options = {}) {
  const geometry = getMoveGeometry(current, previous);
  return {
    element,
    parent,
    current,
    previous,
    delta: geometry.delta,
    anchorDelta: options.anchorDelta ?? { x: 0, y: 0 },
    scale: geometry.scale
  };
}
function getScaleFactor(previous, current) {
  return current === 0 ? 1 : previous / current;
}
function getMoveGeometry(current, previous) {
  return {
    delta: {
      x: previous.x - current.x,
      y: previous.y - current.y
    },
    scale: {
      x: getScaleFactor(previous.width, current.width),
      y: getScaleFactor(previous.height, current.height)
    }
  };
}

// src/exitLayout.ts
function lockNodeForAbsoluteExit(node, rect) {
  const style = node.style;
  const lockedStyles = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    bottom: style.bottom,
    width: style.width,
    height: style.height,
    margin: style.margin,
    pointerEvents: style.pointerEvents
  };
  style.position = "absolute";
  style.top = `${rect.y}px`;
  style.left = `${rect.x}px`;
  style.right = "auto";
  style.bottom = "auto";
  style.width = `${rect.width}px`;
  style.height = `${rect.height}px`;
  style.margin = "0";
  style.pointerEvents = "none";
  return lockedStyles;
}
function restoreLockedNode(node, lockedStyles) {
  const style = node.style;
  style.position = lockedStyles.position;
  style.top = lockedStyles.top;
  style.left = lockedStyles.left;
  style.right = lockedStyles.right;
  style.bottom = lockedStyles.bottom;
  style.width = lockedStyles.width;
  style.height = lockedStyles.height;
  style.margin = lockedStyles.margin;
  style.pointerEvents = lockedStyles.pointerEvents;
}
function prepareNodeForExit(node, rect, layoutMode) {
  if (layoutMode === "flow") {
    return {
      layoutMode,
      restore() {
      }
    };
  }
  const lockedStyles = lockNodeForAbsoluteExit(node, rect);
  return {
    layoutMode,
    restore(restoreTarget) {
      restoreLockedNode(restoreTarget, lockedStyles);
    }
  };
}
function restorePreparedExitNode(node, preparedExit) {
  preparedExit.restore(node);
}

// src/transitionPresets.ts
var DEFAULT_TRANSFORM_ORIGIN = "50% 50%";
var DEFAULT_MOVE_TRANSFORM_ORIGIN = "0 0";
function isZeroPoint(point) {
  return !point || point.x === 0 && point.y === 0;
}
function formatTranslate(point) {
  if (point.x === 0 && point.y === 0) {
    return "translate(0, 0)";
  }
  return `translate(${point.x}px, ${point.y}px)`;
}
function formatScale(scale2) {
  return `scale(${scale2.x}, ${scale2.y})`;
}
function buildTransform({
  translate: translate2,
  scale: scale2,
  includeTranslateWhenZero = false,
  includeScaleWhenIdentity = true
}) {
  const parts = [];
  if (translate2 && (includeTranslateWhenZero || !isZeroPoint(translate2))) {
    parts.push(formatTranslate(translate2));
  }
  if (scale2 && (includeScaleWhenIdentity || scale2.x !== 1 || scale2.y !== 1)) {
    parts.push(formatScale(scale2));
  }
  return parts.join(" ");
}
function buildFilter(filter, ownership) {
  if (!ownership.hasBlur) {
    return void 0;
  }
  const blur2 = filter?.blur ?? "0px";
  return `blur(${blur2})`;
}
function resolveTransitionOptions(options, ctx) {
  return typeof options === "function" ? options(ctx) : options;
}
function parseOpacity(value) {
  if (value == null || value === "") {
    return void 0;
  }
  const opacity = Number.parseFloat(value);
  return Number.isFinite(opacity) ? opacity : void 0;
}
function getElementOpacity(element) {
  if (typeof globalThis.getComputedStyle === "function") {
    try {
      const computedOpacity = parseOpacity(globalThis.getComputedStyle(element).opacity);
      if (computedOpacity != null) {
        return computedOpacity;
      }
    } catch {
    }
  }
  if ("style" in element) {
    const inlineOpacity = parseOpacity(element.style?.opacity);
    if (inlineOpacity != null) {
      return inlineOpacity;
    }
  }
  return 1;
}
function toScale(value, fallback) {
  if (typeof value === "number") {
    return { x: value, y: value };
  }
  if (value) {
    return value;
  }
  return { x: fallback, y: fallback };
}
function addPoints(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}
function createTransitionEffect(debugName, build) {
  return { build, debugName };
}
function collectFieldEntries(target, ownership, effectIndex, effectLabel, field, value, offset) {
  if (value === void 0) {
    return;
  }
  const owner = ownership.get(field);
  if (owner && owner.effectIndex !== effectIndex) {
    throw new Error(`${effectLabel} conflicts with another ${owner.label} effect`);
  }
  ownership.set(field, { effectIndex, label: effectLabel });
  const entries = target.get(field) ?? [];
  entries.push({ offset, value });
  target.set(field, entries);
}
function resolveTimelineValue(entries, offset) {
  if (!entries || entries.length === 0) {
    return void 0;
  }
  let next;
  let previous;
  for (const entry of entries) {
    if (entry.offset === offset) {
      return entry.value;
    }
    if (entry.offset < offset) {
      previous = entry;
      continue;
    }
    next = entry;
    break;
  }
  if (previous) {
    return previous.value;
  }
  return next?.value;
}
function compileEffectFrames(ctx, definition) {
  const fieldTimelines = /* @__PURE__ */ new Map();
  const ownership = /* @__PURE__ */ new Map();
  const offsets = /* @__PURE__ */ new Set([0, 1]);
  definition.effects.forEach((effect, effectIndex) => {
    const namedEffect = effect;
    const effectLabel = namedEffect.debugName ?? "effect()";
    const frames = effect.build(ctx);
    for (const frame of frames) {
      offsets.add(frame.offset);
      collectFieldEntries(fieldTimelines, ownership, effectIndex, effectLabel, "opacity", frame.opacity, frame.offset);
      collectFieldEntries(
        fieldTimelines,
        ownership,
        effectIndex,
        effectLabel,
        "transformOrigin",
        frame.transformOrigin,
        frame.offset
      );
      collectFieldEntries(
        fieldTimelines,
        ownership,
        effectIndex,
        effectLabel,
        "transform.translate",
        frame.transform?.translate,
        frame.offset
      );
      collectFieldEntries(
        fieldTimelines,
        ownership,
        effectIndex,
        effectLabel,
        "transform.scale",
        frame.transform?.scale,
        frame.offset
      );
      collectFieldEntries(
        fieldTimelines,
        ownership,
        effectIndex,
        effectLabel,
        "filter.blur",
        frame.filter?.blur,
        frame.offset
      );
      for (const [styleKey, styleValue] of Object.entries(frame.style ?? {})) {
        collectFieldEntries(
          fieldTimelines,
          ownership,
          effectIndex,
          effectLabel,
          `style.${styleKey}`,
          styleValue,
          frame.offset
        );
      }
    }
  });
  const sortedOffsets = Array.from(offsets).sort((a, b) => a - b);
  const atomicOwnership = {
    hasTranslate: ownership.has("transform.translate"),
    hasScale: ownership.has("transform.scale"),
    hasBlur: ownership.has("filter.blur")
  };
  const keyframes = sortedOffsets.map((offset) => {
    const values = {
      opacity: resolveTimelineValue(fieldTimelines.get("opacity"), offset),
      transformOrigin: resolveTimelineValue(
        fieldTimelines.get("transformOrigin"),
        offset
      ),
      translate: resolveTimelineValue(
        fieldTimelines.get("transform.translate"),
        offset
      ),
      scale: resolveTimelineValue(
        fieldTimelines.get("transform.scale"),
        offset
      ),
      blur: resolveTimelineValue(fieldTimelines.get("filter.blur"), offset),
      style: {}
    };
    for (const [field, entries] of fieldTimelines) {
      if (!field.startsWith("style.")) {
        continue;
      }
      const styleKey = field.slice("style.".length);
      const styleValue = resolveTimelineValue(entries, offset);
      if (styleValue !== void 0) {
        values.style[styleKey] = styleValue;
      }
    }
    const keyframe = {
      ...values.style,
      offset
    };
    if (values.opacity !== void 0) {
      keyframe.opacity = values.opacity;
    }
    if (values.transformOrigin !== void 0) {
      keyframe.transformOrigin = values.transformOrigin;
    }
    const transform = buildTransform({
      translate: values.translate,
      scale: values.scale,
      includeTranslateWhenZero: atomicOwnership.hasTranslate,
      includeScaleWhenIdentity: atomicOwnership.hasScale
    });
    if (transform) {
      keyframe.transform = transform;
    }
    const filter = buildFilter(values.blur == null ? void 0 : { blur: values.blur }, atomicOwnership);
    if (filter) {
      keyframe.filter = filter;
    }
    return keyframe;
  });
  return {
    keyframes,
    ownership: atomicOwnership
  };
}
function createTransitionAnimation(ctx, definition) {
  const { keyframes } = compileEffectFrames(ctx, definition);
  return ctx.element.animate(keyframes, resolveTransitionOptions(definition.options, ctx));
}
function createExitLayoutEffect() {
  return createTransitionEffect("exitLayout()", ({ rect, layoutMode }) => {
    if (layoutMode !== "absolute") {
      return [];
    }
    return [
      {
        offset: 0,
        style: {
          position: "absolute",
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: "0",
          top: `${rect.y}px`,
          left: `${rect.x}px`
        }
      },
      {
        offset: 1,
        style: {
          position: "absolute",
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: "0",
          top: `${rect.y}px`,
          left: `${rect.x}px`
        }
      }
    ];
  });
}
function isTransitionPhaseDefinition(phase) {
  return typeof phase !== "function";
}
function compileTransitionPhase(phase) {
  if (!phase) {
    return void 0;
  }
  if (!isTransitionPhaseDefinition(phase)) {
    return phase;
  }
  return (ctx) => createTransitionAnimation(ctx, phase);
}
function defineTransition(transition) {
  return {
    enter: compileTransitionPhase(transition.enter),
    exit: compileTransitionPhase(transition.exit),
    move: compileTransitionPhase(transition.move)
  };
}
function normalizeTransition(transition) {
  if (!transition) {
    return void 0;
  }
  return defineTransition(transition);
}

// src/effects.ts
function withPhases(effect, phases) {
  return {
    ...effect,
    phases
  };
}
function isExitContext(ctx) {
  return "layoutMode" in ctx;
}
function toCssLength(value) {
  return typeof value === "number" ? `${value}px` : value;
}
function normalizeFadeOptions(valueOrOptions) {
  if (typeof valueOrOptions === "number" || valueOrOptions === void 0) {
    return { value: valueOrOptions };
  }
  return valueOrOptions;
}
function normalizeScaleOptions(valueOrOptions) {
  if (typeof valueOrOptions === "number" || valueOrOptions === void 0 || "x" in valueOrOptions && "y" in valueOrOptions) {
    return { value: valueOrOptions };
  }
  return valueOrOptions;
}
function normalizeBlurOptions(valueOrOptions) {
  if (typeof valueOrOptions === "number" || typeof valueOrOptions === "string" || valueOrOptions === void 0) {
    return { value: valueOrOptions };
  }
  return valueOrOptions;
}
function normalizeTranslateOptions(valueOrOptions) {
  if ("x" in valueOrOptions && "y" in valueOrOptions) {
    return { value: valueOrOptions };
  }
  return valueOrOptions;
}
function resolveAxisValue(value, size) {
  if (typeof value === "number") {
    return value;
  }
  const matched = /^(-?\d+(?:\.\d+)?)%$/.exec(value.trim());
  if (!matched) {
    throw new Error(`translate() percentage must be a valid percent string, received "${value}"`);
  }
  return Number.parseFloat(matched[1] ?? "0") / 100 * size;
}
function resolveTranslateValue(value, ctx) {
  return {
    x: resolveAxisValue(value.x, ctx.rect.width),
    y: resolveAxisValue(value.y, ctx.rect.height)
  };
}
function fade(valueOrOptions) {
  const options = normalizeFadeOptions(valueOrOptions);
  return withPhases(
    createTransitionEffect("fade()", (ctx) => {
      const baseOpacity = getElementOpacity(ctx.element);
      const timeline = options.keyframes ? options.keyframes : isExitContext(ctx) ? [
        { offset: 0, value: 1 },
        { offset: 1, value: options.value ?? 0 }
      ] : [
        { offset: 0, value: options.value ?? 0 },
        { offset: 1, value: 1 }
      ];
      return timeline.map(({ offset, value }) => ({
        offset,
        opacity: value * baseOpacity
      }));
    }),
    ["enter", "exit"]
  );
}
function scale(valueOrOptions) {
  const options = normalizeScaleOptions(valueOrOptions);
  return withPhases(
    createTransitionEffect("scale()", (ctx) => {
      const timeline = options.keyframes ? options.keyframes.map(({ offset, value }) => ({ offset, value: toScale(value, 1) })) : isExitContext(ctx) ? [
        { offset: 0, value: toScale(1, 1) },
        { offset: 1, value: toScale(options.value, 0.96) }
      ] : [
        { offset: 0, value: toScale(options.value, 0.96) },
        { offset: 1, value: toScale(1, 1) }
      ];
      return timeline.map(({ offset, value }) => ({
        offset,
        transformOrigin: options.origin ?? DEFAULT_TRANSFORM_ORIGIN,
        transform: {
          scale: value
        }
      }));
    }),
    ["enter", "exit"]
  );
}
function blur(valueOrOptions) {
  const options = normalizeBlurOptions(valueOrOptions);
  return withPhases(
    createTransitionEffect("blur()", (ctx) => {
      const timeline = options.keyframes ? options.keyframes.map(({ offset, value }) => ({ offset, value: toCssLength(value) })) : isExitContext(ctx) ? [
        { offset: 0, value: "0px" },
        { offset: 1, value: toCssLength(options.value ?? 8) }
      ] : [
        { offset: 0, value: toCssLength(options.value ?? 8) },
        { offset: 1, value: "0px" }
      ];
      return timeline.map(({ offset, value }) => ({
        offset,
        filter: {
          blur: value
        }
      }));
    }),
    ["enter", "exit"]
  );
}
function translate(valueOrOptions) {
  const options = normalizeTranslateOptions(valueOrOptions);
  return withPhases(
    createTransitionEffect("translate()", (ctx) => {
      const target = resolveTranslateValue(options.value ?? { x: 0, y: 0 }, ctx);
      const timeline = options.keyframes ? options.keyframes.map(({ offset, value }) => ({
        offset,
        value: isExitContext(ctx) ? addPoints(ctx.anchorDelta, resolveTranslateValue(value, ctx)) : resolveTranslateValue(value, ctx)
      })) : isExitContext(ctx) ? [
        { offset: 0, value: ctx.anchorDelta },
        { offset: 1, value: addPoints(ctx.anchorDelta, target) }
      ] : [
        { offset: 0, value: target },
        { offset: 1, value: { x: 0, y: 0 } }
      ];
      return timeline.map(({ offset, value }) => ({
        offset,
        transform: {
          translate: value
        }
      }));
    }),
    ["enter", "exit"]
  );
}
function flip(options = {}) {
  return withPhases(
    createTransitionEffect("flip()", (ctx) => {
      const compensatedDelta = {
        x: ctx.delta.x + ctx.anchorDelta.x,
        y: ctx.delta.y + ctx.anchorDelta.y
      };
      return [
        {
          offset: 0,
          transformOrigin: options.origin ?? DEFAULT_MOVE_TRANSFORM_ORIGIN,
          transform: {
            translate: compensatedDelta,
            ...options.scale === false ? {} : { scale: ctx.scale }
          }
        },
        {
          offset: 1,
          transformOrigin: options.origin ?? DEFAULT_MOVE_TRANSFORM_ORIGIN,
          transform: {
            translate: { x: 0, y: 0 },
            ...options.scale === false ? {} : { scale: { x: 1, y: 1 } }
          }
        }
      ];
    }),
    ["move"]
  );
}
var effects = {
  fade,
  scale,
  blur,
  translate,
  flip
};

// src/preset.ts
function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function validateEffectPhase(effect, phase) {
  if (!effect.phases || effect.phases.includes(phase)) {
    return;
  }
  if (effect.phases.length === 1) {
    throw new Error(`${effect.debugName ?? "effect()"} can only be used in ${effect.phases[0]}`);
  }
  throw new Error(`${effect.debugName ?? "effect()"} cannot be used in ${phase}`);
}
function createEnterPhase(effectList, options) {
  if (effectList.length === 0) {
    return void 0;
  }
  effectList.forEach((effect) => validateEffectPhase(effect, "enter"));
  return {
    effects: effectList,
    options
  };
}
function createExitPhase(effectList, options) {
  if (effectList.length === 0) {
    return void 0;
  }
  effectList.forEach((effect) => validateEffectPhase(effect, "exit"));
  return {
    effects: [createExitLayoutEffect(), ...effectList],
    options
  };
}
function createMovePhase(effect, options) {
  if (!effect) {
    return void 0;
  }
  validateEffectPhase(effect, "move");
  return {
    effects: [effect],
    options
  };
}
function preset(spec) {
  return {
    enter: createEnterPhase(toArray(spec.enter), spec.timing?.enter),
    exit: createExitPhase(toArray(spec.exit), spec.timing?.exit),
    move: createMovePhase(spec.move, spec.timing?.move)
  };
}
var defaultTransition = defineTransition(
  preset({
    enter: effects.fade(0),
    move: effects.flip(),
    timing: {
      enter: { duration: 250, easing: "ease-out" },
      move: { duration: 250, easing: "ease-in" }
    }
  })
);
var defaultExit = defineTransition(
  preset({
    exit: effects.fade(0),
    timing: {
      exit: { duration: 250, easing: "ease-in" }
    }
  })
);
function defaultEnterTransition(ctx) {
  return defaultTransition.enter(ctx);
}
function defaultExitTransition(ctx) {
  return defaultExit.exit(ctx);
}
function defaultMoveTransition(ctx) {
  return defaultTransition.move(ctx);
}

// src/useForkRef.ts
import { useCallback } from "react";
function useForkRef(...refs) {
  return useCallback((node) => {
    refs.forEach((ref) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else if (ref.current !== void 0) {
          ref.current = node;
        }
      }
    });
  }, refs);
}

// src/AutoTransition.tsx
import { jsx } from "react/jsx-runtime";
function toParentBounds(parent) {
  return {
    width: parent.width,
    height: parent.height
  };
}
function getViewportRect(rect) {
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}
function AutoTransition({
  as,
  children,
  transition,
  exitLayout = "absolute",
  ref: externalRef,
  patch,
  ...rest
}) {
  const Component = as ?? Slot;
  const ref = useRef(null);
  useEffect(() => {
    const resolvedTransition = normalizeTransition(transition);
    const exiting = /* @__PURE__ */ new Set();
    let batch = null;
    const target = ref.current;
    if (patch) {
      patchActivity(target);
    }
    let measureTarget = target;
    let styles = getComputedStyle(measureTarget);
    while (styles.display === "contents" || styles.position === "static" && measureTarget !== document.body) {
      measureTarget = measureTarget.parentElement;
      styles = getComputedStyle(measureTarget);
    }
    function measureParentRect() {
      const borderBox = measureTarget.getBoundingClientRect();
      const currentStyles = getComputedStyle(measureTarget);
      const borderLeft = parseFloat(currentStyles.borderLeftWidth || "0");
      const borderRight = parseFloat(currentStyles.borderRightWidth || "0");
      const borderTop = parseFloat(currentStyles.borderTopWidth || "0");
      const borderBottom = parseFloat(currentStyles.borderBottomWidth || "0");
      return {
        left: borderBox.left + borderLeft,
        top: borderBox.top + borderTop,
        width: borderBox.width - borderLeft - borderRight,
        height: borderBox.height - borderTop - borderBottom
      };
    }
    function captureSnapshot() {
      const parent = measureParentRect();
      const rects = /* @__PURE__ */ new Map();
      for (const child of target.children) {
        if (!(child instanceof Element) || exiting.has(child)) continue;
        rects.set(child, getRelativePosition(child, parent));
      }
      return { parent, rects };
    }
    function ensureBatch() {
      if (batch) {
        return batch;
      }
      const nextBatch = {
        before: captureSnapshot(),
        pendingExits: /* @__PURE__ */ new Map(),
        pendingEnters: /* @__PURE__ */ new Set()
      };
      batch = nextBatch;
      queueMicrotask(() => {
        if (batch !== nextBatch) return;
        batch = null;
        flushBatch(nextBatch);
      });
      return nextBatch;
    }
    function flushBatch(activeBatch) {
      const after = captureSnapshot();
      const finalNodes = Array.from(after.rects.keys());
      const plan = planBatchAnimations({
        before: activeBatch.before,
        after,
        finalNodes,
        pendingEnters: activeBatch.pendingEnters,
        pendingExits: activeBatch.pendingExits
      });
      for (const move of plan.moves) {
        animateNodeMove(move.node, move.current, move.previous, after.parent, {
          anchorDelta: move.anchorDelta
        });
      }
      for (const enter of plan.enters) {
        animateNodeEnter(enter.node, enter.rect, after.parent);
      }
      for (const exit of plan.exits) {
        animateNodeExit(exit.node, exit.rect, activeBatch.before.parent, {
          viewportRect: exit.viewportRect,
          anchorDelta: exit.anchorDelta
        });
      }
    }
    target.removeChild = function removeChild(node) {
      if (node instanceof Element) {
        if (exiting.has(node)) return node;
        const activeBatch = ensureBatch();
        if (activeBatch.pendingEnters.delete(node) && !activeBatch.before.rects.has(node)) {
          if (node.parentNode === target) {
            Element.prototype.removeChild.call(target, node);
          }
          return node;
        }
        const rect = activeBatch.before.rects.get(node) ?? getRelativePosition(node, activeBatch.before.parent);
        const viewportRect = getViewportRect(node.getBoundingClientRect());
        const preparedExit = prepareNodeForExit(node, rect, exitLayout);
        exiting.add(node);
        activeBatch.pendingExits.set(node, {
          node,
          rect,
          viewportRect,
          preparedExit
        });
        return node;
      }
      ensureBatch();
      return Element.prototype.removeChild.call(this, node);
    };
    target.insertBefore = function insertBefore(node, child) {
      const activeBatch = ensureBatch();
      if (!(node instanceof Element)) {
        return Element.prototype.insertBefore.call(this, node, child);
      }
      const inserted = Element.prototype.insertBefore.call(this, node, child);
      const pendingExit = activeBatch.pendingExits.get(node);
      if (pendingExit) {
        activeBatch.pendingExits.delete(node);
        exiting.delete(node);
        restorePreparedExitNode(node, pendingExit.preparedExit);
        return inserted;
      }
      if (!activeBatch.before.rects.has(node)) {
        activeBatch.pendingEnters.add(node);
      }
      return inserted;
    };
    target.appendChild = function appendChild(node) {
      const activeBatch = ensureBatch();
      if (!(node instanceof Element)) {
        return Element.prototype.appendChild.call(this, node);
      }
      const appended = Element.prototype.appendChild.call(this, node);
      const pendingExit = activeBatch.pendingExits.get(node);
      if (pendingExit) {
        activeBatch.pendingExits.delete(node);
        exiting.delete(node);
        restorePreparedExitNode(node, pendingExit.preparedExit);
        return appended;
      }
      if (!activeBatch.before.rects.has(node)) {
        activeBatch.pendingEnters.add(node);
      }
      return appended;
    };
    return () => {
      target.removeChild = Element.prototype.removeChild;
      target.insertBefore = Element.prototype.insertBefore;
      target.appendChild = Element.prototype.appendChild;
    };
    function animateNodeExit(node, rect, parent, options) {
      const context = buildExitContext(node, rect, toParentBounds(parent), {
        ...options,
        layoutMode: exitLayout
      });
      const animation = resolvedTransition?.exit ? resolvedTransition.exit(context) : defaultExitTransition(context);
      const finalize = () => {
        exiting.delete(node);
        if (node.parentNode === target) {
          Element.prototype.removeChild.call(target, node);
        }
      };
      animation.finished.then(finalize).catch(finalize);
      return animation;
    }
    function animateNodeEnter(node, rect, parent) {
      const currentParent = parent ?? measureParentRect();
      const currentRect = rect ?? getRelativePosition(node, currentParent);
      const context = buildEnterContext(node, currentRect, toParentBounds(currentParent));
      return resolvedTransition?.enter ? resolvedTransition.enter(context) : defaultEnterTransition(context);
    }
    function animateNodeMove(node, rect, oldRect, parent, options) {
      const context = buildMoveContext(node, rect, oldRect, toParentBounds(parent), options);
      return resolvedTransition?.move ? resolvedTransition.move(context) : defaultMoveTransition(context);
    }
    function getRelativePosition(node, parent = measureParentRect()) {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left - parent.left,
        y: rect.top - parent.top,
        width: rect.width,
        height: rect.height
      };
    }
  }, [exitLayout, patch, transition]);
  const forkedRef = useForkRef(ref, externalRef);
  return /* @__PURE__ */ jsx(Component, { ref: forkedRef, ...rest, children });
}
function withAutoTransition(Component, options) {
  const WithAutoTransition = (props) => {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      /* @__PURE__ */ jsx(AutoTransition, { ...options, children: /* @__PURE__ */ jsx(Component, { ...props }) })
    );
  };
  const componentName = typeof Component === "string" ? Component : Component.displayName || Component.name || "Component";
  WithAutoTransition.displayName = `withAutoTransition(${componentName})`;
  return WithAutoTransition;
}
export {
  AutoTransition,
  buildEnterContext,
  buildExitContext,
  buildMoveContext,
  defaultEnterTransition,
  defaultExitTransition,
  defaultMoveTransition,
  defineTransition,
  effects,
  getMoveGeometry,
  getScaleFactor,
  preset,
  withAutoTransition
};
