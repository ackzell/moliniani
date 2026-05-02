import { jsx } from "@motion-canvas/2d";
import type { Node, NodeProps, View2D } from "@motion-canvas/2d";
import type { DefineComponent, ComponentInstance } from "vue";
import { nextTick } from "vue";
import { createRef, type Reference } from "@motion-canvas/core";
import { VueNode } from "./VueNode";
import type { MolinianiHandle, VueNodeConstructor } from "./types";
import type { MnRef } from "./ref";
import { makeAnimatable } from "./bridge";

/**
 * Creates a typed Motion Canvas ref for a Vue SFC.
 *
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

type VueNodeProps<P> = Omit<NodeProps, "ref"> & P;

/**
 * Places a Vue SFC as a node in the Motion Canvas scene graph.
 *
 * Accepts the raw `.vue` import directly — no manual `defineVueNode()` call
 * needed. The ref parameter is optional; omit it when you don't need to
 * animate the component:
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 *
 * // Without ref:
 * view.add(mnVue(MyBox, { label: 'Hello', x: -400 }))
 *
 * // With ref for animation:
 * const box = createVueRef(MyBox)
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
    constructor(props: NodeProps & P) {
      super(props as NodeProps & P, sfc);

      // Add GSAP-backed tween methods for numeric Vue-specific props so that
      // `yield* box().myNumericProp(1, 0.5)` works alongside MC signal tweens.
      for (const key in this._vueState) {
        if (typeof (this._vueState as Record<string, any>)[key] === "number") {
          (this as Record<string, any>)[key] = makeAnimatable(
            this._vueState as unknown as Record<string, any>,
            key,
          );
        }
      }
    }
  }

  // MC JSX runtime checks `type.prototype.isClass`, not a static field.
  (DefinedVueNode as any).prototype.isClass = true;
  // Mark as wrapped so a second defineVueNode() call (e.g. explicit call in a
  // scene file when the Vite plugin has already transformed the import) is a no-op.
  (DefinedVueNode as any).__mnWrapped = true;

  return DefinedVueNode as unknown as VueNodeConstructor<ComponentInstance<C>["$props"]>;
}

/**
 * Mounts a Vue SFC as a DOM overlay on the Motion Canvas stage.
 *
 * @deprecated Prefer the native JSX syntax via `defineVueNode` / the Vite
 *   plugin, which integrates with MC's scene graph: `view.add(<MyBox />)`.
 */
export async function mountVue<P extends Record<string, any>>(
  view: View2D,
  ref: MnRef<P>,
  props: P,
): Promise<MolinianiHandle<P>> {
  const node = new VueNode<P>(props as any, ref._component);
  await nextTick();

  const handle = node.getHandle() as MolinianiHandle<P>;
  ref._setHandle(handle);

  return handle;
}
