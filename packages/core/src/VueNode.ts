// packages/core/src/VueNode.ts
import { Node, type NodeProps } from "@motion-canvas/2d";
import { createApp, h, reactive, type App, type Component } from "@vue/runtime-dom";
import { useScene } from "@motion-canvas/core";
import gsap from "gsap";
import type { MolinianiHandle } from "./types";
import { makeAnimatable } from "./bridge";

/**
 * All property keys defined on MC's NodeProps interface.
 * Any prop key NOT in this set is treated as a Vue component prop.
 */
const KNOWN_NODE_KEYS = new Set<string>([
  "ref",
  "children",
  "spawner",
  "key",
  "x",
  "y",
  "position",
  "rotation",
  "scaleX",
  "scaleY",
  "scale",
  "skewX",
  "skewY",
  "skew",
  "zIndex",
  "opacity",
  "cache",
  "cachePadding",
  "cachePaddingTop",
  "cachePaddingBottom",
  "cachePaddingLeft",
  "cachePaddingRight",
  "composite",
  "compositeOperation",
  "filters",
  "shaders",
  "shadowColor",
  "shadowBlur",
  "shadowOffsetX",
  "shadowOffsetY",
  "shadowOffset",
]);

let nodeCounter = 0;

export class VueNode<P extends Record<string, any> = {}> extends Node {
  private _app: App | null = null;
  private _container: HTMLElement | null = null;
  private _exposed: Record<string, any> = {};
  /** Reactive Vue component prop state. */
  readonly _vueState: P;
  private readonly _nodeId: string;

  constructor(props: NodeProps & P, component: Component) {
    super(props); // Node silently ignores props not registered as signals

    this._nodeId = `moliniani-node-${nodeCounter++}`;

    // Extract only Vue-specific props (those absent from NodeProps)
    const vueProps = Object.fromEntries(
      Object.entries(props).filter(([k]) => !KNOWN_NODE_KEYS.has(k)),
    ) as P;

    this._vueState = reactive({ ...vueProps }) as P;
    this._mountVue(component, props);
  }

  private _mountVue(component: Component, initialProps: Record<string, any>): void {
    const existing = document.getElementById(this._nodeId);
    if (existing) existing.remove();

    this._container = document.createElement("div");
    this._container.id = this._nodeId;

    const canvas = document.querySelector("canvas");
    if (!canvas?.parentElement) {
      throw new Error("Motion Canvas canvas not found");
    }

    canvas.parentElement.appendChild(this._container);

    // Anchor the overlay container to the stage's top-left corner so Vue
    // components with `position: absolute` + `top/left` behave as expected.
    this._container.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 0;
      height: 0;
      transform-origin: 0 0;
      pointer-events: none;
      z-index: 9999;
    `;

    // Apply initial transform via GSAP for the legacy mountVue() path
    // (when this node is not added to the MC scene graph via view.add)
    gsap.set(this._container, {
      x: initialProps.x ?? 0,
      y: initialProps.y ?? 0,
      scale: typeof initialProps.scale === "number" ? initialProps.scale : 1,
      rotation: initialProps.rotation ?? 0,
      opacity: initialProps.opacity ?? 1,
    });

    const state = this._vueState;
    this._app = createApp({ render: () => h(component, state) });
    this._app.mount(this._container);

    const instance = this._app._instance;
    const child = instance?.subTree?.component;
    this._exposed = child?.exposed ?? {};

    const scene = useScene() as any;
    scene.afterReset.subscribe(() => {
      this._app?.unmount();
      this._container?.remove();
      this._app = null;
      this._container = null;
    });
  }

  /**
   * Called every MC render frame when this node is part of the scene graph
   * (i.e. added via `view.add(<MyBox />)`).
   *
   * Syncs MC world transform signals to the DOM overlay container so the
   * Vue component visually tracks the node's position, scale, and rotation.
   */
  protected override draw(context: CanvasRenderingContext2D): void {
    if (this._container) {
      const pos = this.absolutePosition();
      const sc = this.absoluteScale();
      const rot = this.absoluteRotation();

      this._container.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg) scale(${sc.x}, ${sc.y})`;
      this._container.style.opacity = String(this.absoluteOpacity());
    }
    super.draw(context);
  }

  /**
   * Returns an animatable handle for backward-compatible use with `mountVue()`.
   *
   * Built-in transforms (x, y, scale, rotation, opacity) are driven by GSAP
   * directly on the container div — matching the original overlay behaviour.
   * Numeric Vue-specific props are also animated via GSAP on the reactive state.
   *
   * @deprecated Prefer the native JSX syntax with `view.add(<MyComponent />)`.
   */
  getHandle(): MolinianiHandle<P> & Record<string, any> {
    const handle: any = {
      props: this._vueState,

      call: async (name: string, ...args: any[]) => {
        const fn = this._exposed[name];
        if (typeof fn !== "function") {
          throw new Error(`Method "${name}" is not exposed`);
        }
        return fn(...args);
      },

      unmount: () => {
        this._app?.unmount();
        this._container?.remove();
        this._app = null;
        this._container = null;
      },
    };

    // Built-in transforms: GSAP on the container element (legacy overlay path)
    const container = this._container!;
    for (const key of ["x", "y", "scale", "rotation", "opacity"]) {
      handle[key] = makeAnimatable(container as unknown as Record<string, any>, key);
    }

    // Numeric Vue-specific props
    for (const key in this._vueState) {
      if (typeof this._vueState[key] === "number") {
        handle[key] = makeAnimatable(this._vueState as unknown as Record<string, any>, key);
      }
    }

    return handle;
  }
}
