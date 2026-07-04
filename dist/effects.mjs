// src/transitionPresets.ts
var DEFAULT_TRANSFORM_ORIGIN = "50% 50%";
var DEFAULT_MOVE_TRANSFORM_ORIGIN = "0 0";
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
export {
  blur,
  effects,
  fade,
  flip,
  scale,
  translate
};
