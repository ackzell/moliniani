import { createRef } from "@motion-canvas/core";
import type { DefineComponent, ComponentInstance } from "vue";
import type { VueNodeConstructor } from "./types";

/**
 * Creates a typed Motion Canvas ref for a Moliniani component (Vue or TresJS).
 *
 * Pass the raw `.vue` import — the argument is used only for type inference.
 * Use the ref with `mnVue()` or `mnTres()` to place the component in the scene:
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 * import TresBox from '../components/TresBox.vue'
 *
 * const vueBox = createMnRef(MyBox)
 * const tresBox = createMnRef(TresBox)
 *
 * view.add(mnVue(MyBox, vueBox, { label: 'Hello' }))
 * view.add(mnTres(TresBox, tresBox, { rotationY: 0 }))
 * ```
 */
export function createMnRef<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
): ReturnType<typeof createRef<InstanceType<VueNodeConstructor<P>>>>;
export function createMnRef<C extends DefineComponent<any, any, any>>(
  sfc: C,
): ReturnType<typeof createRef<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>>;
export function createMnRef(_sfcOrCls: any): ReturnType<typeof createRef<any>> {
  return createRef<any>();
}
