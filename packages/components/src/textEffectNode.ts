// packages/components/src/textEffectNode.ts
import { linear, type ThreadGenerator } from "@motion-canvas/core";
import { molinianiDebugLog, type VueNodeConstructor } from "@moliniani/core";

/**
 * `defineVueNode()` `extend` factory shared by the text-effect SFC wrappers.
 *
 * Cascade effects (`target !== "whole"`) tween every split unit with a per-unit
 * stagger, so the scene tween's own easing would compound with the signature
 * per-unit easing and the cascade could drift from the scene tween. This
 * factory fixes both on the node's `phase` and `exit` methods:
 *
 * 1. **Records the tween duration as the timeline's `total`.** `yield*
 *    node.phase(1, seconds)` stores `total = seconds * 1000` (and `exit` →
 *    `exitTotal`) on the node's `_vueState`, which the effect driver reads as
 *    its `total` / `exitTotal` knob; the derived stagger then makes the last
 *    unit land exactly when the tween ends, so internal ms match scene ms and
 *    the reveal hits its audio cue.
 * 2. **For cascade effects, forces the tween linear** (debug-warns if the
 *    scene passed its own easing). The signature per-unit ease is the only
 *    easing a cascade applies — a scene ease would be a double-ease and would
 *    shift every unit off its per-unit timeline.
 *
 * Whole-text / sweep effects (scramble, glow, typewriter, shimmer-sweep, …)
 * apply no per-unit stagger and keep their scene easing — don't wrap those with
 * this factory.
 */
export function textEffectExtend(cascade: boolean) {
  return <P extends Record<string, any>>(Base: VueNodeConstructor<P>): VueNodeConstructor<P> =>
    class extends (Base as unknown as new (props: Record<string, any>) => any) {
      constructor(props: Record<string, any>) {
        super(props);
        wrapPhaseSignal(this, "phase", "total", cascade);
        wrapPhaseSignal(this, "exit", "exitTotal", cascade);
      }
    } as unknown as VueNodeConstructor<P>;
}

function wrapPhaseSignal(
  instance: Record<string, any>,
  name: "phase" | "exit",
  totalKey: "total" | "exitTotal",
  cascade: boolean,
) {
  const signal = instance[name] as
    | ((to: number, duration?: number, ease?: unknown) => ThreadGenerator)
    | undefined;
  if (typeof signal !== "function") return;
  instance[name] = ((to: number, duration?: number, ease?: unknown) => {
    if (typeof duration === "number" && duration > 0) {
      instance._vueState[totalKey] = duration * 1000;
    }
    if (cascade) {
      if (ease !== undefined && ease !== linear) {
        molinianiDebugLog(
          `textEffectExtend: "${instance.constructor.name}" is a cascade effect — the ${name} ` +
            `easing param is ignored (the per-unit signature ease is the only ease); ` +
            `passing one has no effect.`,
          { ease },
        );
      }
      return signal(to, duration, linear);
    }
    return signal(to, duration, ease);
  }) as typeof signal;
}
