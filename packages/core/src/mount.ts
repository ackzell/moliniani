import { jsx } from "@motion-canvas/2d";
import type { LayoutProps, Node } from "@motion-canvas/2d";
import type { DefineComponent, ComponentInstance } from "vue";
import {
  createRef,
  createSignal,
  Color,
  type Reference,
  type SimpleSignal,
} from "@motion-canvas/core";
import { VueNode } from "./VueNode";
import type { VueNodeConstructor } from "./types";
import { defineTresNode } from "./TresNode";

/**
 * Creates a typed Motion Canvas ref for a Vue SFC.
 *
 * @deprecated Use `createMnRef` instead for a unified API across all Moliniani components.
 * Pass the raw `.vue` import — the argument is used only for type inference.
 * Use the ref with `mnVue()` to place the component in the scene:
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 *
 * const box = createVueRef(MyBox)
 * view.add(mnVue(MyBox, box, { label: 'Hello', opacity: 1, x: -400 }))
 * yield* box().opacity(0, 1)
 * ```
 */
export function createVueRef<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
): Reference<InstanceType<VueNodeConstructor<P>>>;
export function createVueRef<C extends DefineComponent<any, any, any>>(
  sfc: C,
): Reference<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>;
export function createVueRef(_sfcOrCls: any): Reference<any> {
  return createRef<any>();
}

type VueNodeProps<P> = Omit<LayoutProps, "ref"> & P;

/**
 * Places a Vue SFC as a node in the Motion Canvas scene graph.
 *
 * Automatically detects TresJS components and uses TresNode for 3D rendering.
 * For regular Vue components, uses VueNode for HTML overlay rendering.
 *
 * Accepts the raw `.vue` import directly — no manual `defineVueNode()` or
 * `defineTresNode()` call needed. The ref parameter is optional; omit it when
 * you don't need to animate the component:
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 * import TresBox from '../components/TresBox.vue'
 *
 * // Regular Vue component (2D HTML overlay):
 * view.add(mnVue(MyBox, { label: 'Hello', x: -400 }))
 *
 * // TresJS component (3D WebGL):
 * view.add(mnVue(TresBox, { rotationY: 0, color: '#4488ff' }))
 *
 * // With ref for animation:
 * const box = createMnRef(MyBox)
 * view.add(mnVue(MyBox, box, { label: 'Hello', opacity: 1, x: -400 }))
 * yield* box().opacity(0, 1)
 * ```
 */
export function mnVue<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
  props?: VueNodeProps<P>,
): Node;
export function mnVue<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
  ref: Reference<InstanceType<VueNodeConstructor<P>>>,
  props?: VueNodeProps<P>,
): Node;
export function mnVue<C extends DefineComponent<any, any, any>>(
  sfc: C,
  props?: VueNodeProps<ComponentInstance<C>["$props"]>,
): Node;
export function mnVue<C extends DefineComponent<any, any, any>>(
  sfc: C,
  ref: Reference<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>,
  props?: VueNodeProps<ComponentInstance<C>["$props"]>,
): Node;
export function mnVue(
  sfc: any,
  refOrProps?: Reference<any> | Record<string, any>,
  maybeProps?: Record<string, any>,
): Node {
  // If the Vite plugin already wrapped this .vue import as a VueNode, recover the original SFC.
  const rawSfc = (sfc as any).__mnWrapped ? ((sfc as any).__mnOriginalSFC ?? sfc) : sfc;

  // Auto-detect TresJS components by checking if they're already wrapped as TresNode
  // or by recovering the original SFC and checking if it's a TresJS component.
  const isTres =
    (rawSfc as any).__mnTresWrapped || (rawSfc === sfc && (sfc as any).__mnTresWrapped);

  let cls: any;
  if (isTres) {
    // Use TresNode for TresJS components
    cls = (rawSfc as any).__mnTresWrapped ? rawSfc : defineTresNode(rawSfc);
  } else {
    // Use VueNode for regular Vue components
    cls = (sfc as any).isClass || (sfc as any).__mnWrapped ? sfc : defineVueNode(sfc);
  }

  let ref: Reference<any> | undefined;
  let props: Record<string, any> = {};

  if (typeof refOrProps === "function") {
    ref = refOrProps as Reference<any>;
    props = maybeProps ?? {};
  } else {
    props = refOrProps ?? {};
  }

  return jsx(cls, { ref, ...props }) as Node;
}

/**
 * Returns true if `value` is a string that can be parsed as a CSS color.
 */
function isCSSColor(value: string): boolean {
  try {
    new Color(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a Motion Canvas `Node` subclass for the given Vue SFC.
 *
 * The returned class can be used directly in MC JSX:
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 * import { createRef } from '@motion-canvas/core'
 *
 * const box = createRef<InstanceType<typeof MyBox>>()
 * view.add(<MyBox ref={box} label="Hello" opacity={0} />)
 *
 * yield* box().opacity(1, 0.5)
 * yield* box().position.x(300, 1)
 * ```
 *
 * The Moliniani Vite plugin calls this automatically for every `*.vue` import
 * in your scene files, so you rarely need to call it by hand.
 */
export function defineVueNode<C extends DefineComponent<any, any, any>>(
  sfc: C,
): VueNodeConstructor<ComponentInstance<C>["$props"]> {
  // Idempotency: if the Vite plugin already wrapped this SFC, return it as-is.
  if ((sfc as any).__mnWrapped) {
    return sfc as unknown as VueNodeConstructor<ComponentInstance<C>["$props"]>;
  }

  type P = ComponentInstance<C>["$props"];

  class DefinedVueNode extends VueNode<P> {
    constructor(props: LayoutProps & P) {
      super(props as LayoutProps & P, sfc);

      // Create an MC signal for each numeric Vue-specific prop.
      // MC signals live on the virtual timeline — they tween, seek, and scrub
      // in both directions exactly like native Node signals (opacity, scale…).
      // _syncDom() reads signal() each frame and pushes the value into Vue
      // reactive state so the component re-renders with the correct frame value.
      for (const key in this._vueState) {
        const initial = (this._vueState as Record<string, any>)[key];
        if (typeof initial === "number") {
          const existing = (this as Record<string, any>)[key] as SimpleSignal<number> | undefined;

          if (typeof existing === "function" && existing.context) {
            // Reuse native MC signal (e.g. width/height on Layout) so parent
            // layout keeps working and scene code can animate as usual.
            this._propSignals.set(key, existing);
          } else {
            const signal = createSignal(initial);
            this._propSignals.set(key, signal);
            // Expose signal as a method on the instance so scene authors can
            // write: yield* box().myNumericProp(600, 0.5)
            (this as Record<string, any>)[key] = signal;
          }
        } else if (typeof initial === "string" && isCSSColor(initial)) {
          const signal = Color.createSignal(initial);
          this._colorSignals.set(key, signal);
          // Expose signal as a method on the instance so scene authors can
          // write: yield* box().backgroundColor('#ff0000', 0.5)
          (this as Record<string, any>)[key] = signal;
        } else if (typeof initial === "string") {
          const signal = createSignal(initial);
          this._stringSignals.set(key, signal);
          // Expose signal as a method on the instance so scene authors can
          // write: yield* box().label('World', 0.5)
          (this as Record<string, any>)[key] = signal;
        }
      }
    }
  }

  // MC JSX runtime checks `type.prototype.isClass`, not a static field.
  (DefinedVueNode as any).prototype.isClass = true;
  // Mark as wrapped so a second defineVueNode() call (e.g. explicit call in a
  // scene file when the Vite plugin has already transformed the import) is a no-op.
  (DefinedVueNode as any).__mnWrapped = true;
  // Keep a reference to the original SFC so mnTres() can recover it when the
  // Vite plugin has already wrapped this import as a VueNode.
  (DefinedVueNode as any).__mnOriginalSFC = sfc;

  return DefinedVueNode as unknown as VueNodeConstructor<ComponentInstance<C>["$props"]>;
}
