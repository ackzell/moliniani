import { jsx } from "@motion-canvas/2d";
import type { LayoutProps, Node } from "@motion-canvas/2d";
import type { DefineComponent, ComponentInstance } from "vue";
import { createSignal, Color, type Reference, type SimpleSignal } from "@motion-canvas/core";
import { VueNode } from "./VueNode";
import type { VueNodeConstructor } from "./types";
import { _mnTres } from "./TresNode";
import { molinianiDebugLog } from "./debug";
import { createMnRef } from "./createRef";
export { createMnRef } from "./createRef";

/**
 * Creates a typed Motion Canvas ref for a Vue SFC.
 *
 * @deprecated Use `createMnRef()` instead for a unified API.
 */
export function createVueRef<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
): Reference<InstanceType<VueNodeConstructor<P>>>;
export function createVueRef<C extends DefineComponent<any, any, any>>(
  sfc: C,
): Reference<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>;
export function createVueRef(sfcOrCls: any): Reference<any> {
  return createMnRef(sfcOrCls);
}

type VueNodeProps<P> = Omit<LayoutProps, "ref"> & P;

/**
 * Auto-detects whether a component is a TresJS 3D component or a regular Vue 2D component.
 *
 * Checks for explicit markers (__mnTresWrapped, __mnTres) or falls back to a
 * naming heuristic: components whose name contains "Tres" (e.g. TresBox, MyTresScene)
 * are treated as TresJS.
 */
function isTresComponent(sfc: any): boolean {
  if (sfc?.__mnTresWrapped) return true;

  // Check the original filename stored by Vite plugin (e.g., "TresBox" from "TresBox.vue")
  const originalFileName = sfc?.__mnOriginalName ?? "";
  if (/Tres/.test(originalFileName)) return true;

  // If wrapped by Vite plugin, check the original SFC
  const rawSfc = sfc?.__mnWrapped ? (sfc.__mnOriginalSFC ?? sfc) : sfc;
  if (rawSfc?.__mnTres) return true;

  // Check the original SFC name if available
  const originalName = rawSfc?.name ?? "";
  if (/Tres/.test(originalName)) return true;

  // Also check the wrapped class name as fallback
  const wrappedName = sfc?.name ?? "";
  if (/Tres/.test(wrappedName)) return true;

  return false;
}

/**
 * Unified function to place a Vue SFC (2D HTML overlay or TresJS 3D WebGL)
 * as a node in the Motion Canvas scene graph.
 *
 * Auto-detects TresJS components (by name prefix "Tres" or explicit markers)
 * and routes to the appropriate renderer. For everything else, uses the Vue
 * HTML overlay compositor.
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 * import TresBox from '../components/TresBox.vue'
 *
 * // 2D Vue component — HTML overlay compositor
 * view.add(mn(MyBox, { label: 'Hello', x: -400 }))
 *
 * // 3D TresJS component — WebGL → drawImage
 * view.add(mn(TresBox, { rotationY: 0, color: '#4488ff', width: 700, height: 500 }))
 *
 * // With ref for animation:
 * const box = createMnRef(MyBox)
 * view.add(mn(MyBox, box, { label: 'Hello', opacity: 1, x: -400 }))
 * yield* box().opacity(0, 1)
 * ```
 */
export function mn<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
  props?: VueNodeProps<P>,
): Node;
export function mn<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
  ref: Reference<InstanceType<VueNodeConstructor<P>>>,
  props?: VueNodeProps<P>,
): Node;
export function mn<C extends DefineComponent<any, any, any>>(
  sfc: C,
  props?: VueNodeProps<ComponentInstance<C>["$props"]>,
): Node;
export function mn<C extends DefineComponent<any, any, any>>(
  sfc: C,
  ref: Reference<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>,
  props?: VueNodeProps<ComponentInstance<C>["$props"]>,
): Node;
export function mn(
  sfc: any,
  refOrProps?: Reference<any> | Record<string, any>,
  maybeProps?: Record<string, any>,
): Node {
  return isTresComponent(sfc)
    ? _mnTres(sfc, refOrProps, maybeProps)
    : _mnVue(sfc, refOrProps, maybeProps);
}

/**
 * @deprecated Use `mn()` instead for a unified API.
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
  return _mnVue(sfc, refOrProps, maybeProps);
}

function _mnVue(
  sfc: any,
  refOrProps?: Reference<any> | Record<string, any>,
  maybeProps?: Record<string, any>,
): Node {
  const cls = (sfc as any).isClass || (sfc as any).__mnWrapped ? sfc : defineVueNode(sfc);
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
 * Pass an optional `extend` factory to attach instance members backed by the
 * SFC's `registerController()` call. The factory receives the base node class
 * and returns a subclass; its extra members are typed through
 * `VueNodeConstructor`'s `I` parameter and flow to `createMnRef()`.
 *
 * ```ts
 * const SplitText = defineVueNode(SplitTextSfc, 'SplitText', (Base) =>
 *   class extends Base {
 *     get units() { return this._controller?.units ?? [] }
 *   },
 * );
 * ```
 *
 * The Moliniani Vite plugin calls this automatically for every `*.vue` import
 * in your scene files, so you rarely need to call it by hand.
 */
export function defineVueNode<
  C extends DefineComponent<any, any, any>,
  I extends Record<string, any> = {},
>(
  sfc: C,
  originalName?: string,
  extend?: (
    Base: VueNodeConstructor<ComponentInstance<C>["$props"]>,
  ) => VueNodeConstructor<ComponentInstance<C>["$props"], I>,
): VueNodeConstructor<ComponentInstance<C>["$props"], I> {
  // Idempotency: if the Vite plugin already wrapped this SFC, return it as-is.
  if ((sfc as any).__mnWrapped) {
    return sfc as unknown as VueNodeConstructor<ComponentInstance<C>["$props"], I>;
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
            // The SFC prop name collides with a native MC node signal that is
            // not in KNOWN_NODE_KEYS (e.g. `offset`, the pivot origin). Its
            // value (a Vector2) would corrupt the Vue prop type, so surface the
            // collision — scene props should avoid these names.
            molinianiDebugLog(`defineVueNode: prop "${key}" collides with a native MC signal`, {
              value: existing(),
            });
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
  // Store the original filename from the Vite plugin for Tres detection
  if (originalName) {
    (DefinedVueNode as any).__mnOriginalName = originalName;
  }

  let Final: VueNodeConstructor<ComponentInstance<C>["$props"], I> =
    DefinedVueNode as unknown as VueNodeConstructor<ComponentInstance<C>["$props"], I>;
  if (extend) {
    Final = extend(DefinedVueNode as unknown as VueNodeConstructor<ComponentInstance<C>["$props"]>);
    // The extend factory returns a plain class; re-apply the markers JSX and
    // the Vite plugin rely on (subclasses inherit `isClass` through the
    // prototype chain, but re-setting it keeps the contract explicit).
    (Final as any).prototype.isClass = true;
    (Final as any).__mnWrapped = true;
    (Final as any).__mnOriginalSFC = sfc;
    if (originalName) {
      (Final as any).__mnOriginalName = originalName;
    }
  }

  return Final;
}
