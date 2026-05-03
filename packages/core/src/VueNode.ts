// packages/core/src/VueNode.ts
import { Node, type NodeProps } from "@motion-canvas/2d";
import { createApp, h, reactive, type App, type Component } from "@vue/runtime-dom";
import { useScene } from "@motion-canvas/core";
import {
  ensureBridgeCanvas,
  ensureHtmlInCanvasCompositor,
  getSceneOverlayId,
} from "./compositor";

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
  private _positioner: HTMLElement | null = null;
  private _didSyncDom = false;
  /** Reactive Vue component prop state. */
  readonly _vueState: P;
  private readonly _nodeId: string;

  private _cleanupDom(): void {
    this._app?.unmount();
    this._container?.remove();
    this._app = null;
    this._container = null;
    this._positioner = null;
  }

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

  private _mountVue(component: Component, _initialProps: Record<string, any>): void {
    const existing = document.getElementById(this._nodeId);
    if (existing) existing.remove();

    const scene = useScene() as any;
    ensureHtmlInCanvasCompositor(scene);

    // Mount as a DIRECT CHILD of the bridge canvas (which has the `layoutsubtree`
    // attribute). This is required so the browser creates cached paint records
    // for the element, making drawElementImage() work.
    //
    // _container: full-canvas-size wrapper so absolute positioning works from
    //             the canvas origin.
    // _positioner: moved to the correct MC world position each frame in draw().
    this._container = document.createElement("div");
    this._container.id = this._nodeId;
    this._container.dataset.molinianiOverlay = "true";
    this._container.dataset.molinianiScene = getSceneOverlayId(scene);
    // Size/position set in draw() once we know the canvas dimensions.
    this._container.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;visibility:hidden;opacity:0";

    this._positioner = document.createElement("div");
    // transform-origin center so rotate/scale behave like MC nodes.
    this._positioner.style.cssText =
      "position:absolute;left:0;top:0;transform-origin:center center;pointer-events:none";

    this._container.appendChild(this._positioner);

    // Attach to bridge canvas — must happen BEFORE the first render so the
    // browser can build paint records during normal layout/paint.
    const bridge = ensureBridgeCanvas(scene);
    bridge.appendChild(this._container);

    const state = this._vueState;
    this._app = createApp({ render: () => h(component, state) });
    this._app.mount(this._positioner);

    scene.afterReset.subscribe(() => {
      this._cleanupDom();
    });
  }

  public override dispose(): void {
    this._cleanupDom();
    super.dispose();
  }

  /**
   * Called every MC render frame when this node is part of the scene graph
   * (i.e. added via `view.add(<MyBox />)`).
   *
   * Syncs MC world transform signals to the DOM overlay container so the
   * Vue component visually tracks the node's position, scale, and rotation.
   */
  protected override draw(context: CanvasRenderingContext2D): void {
    if (this._container && this._positioner) {
      const pos = this.absolutePosition();
      const sc = this.absoluteScale();
      const rot = this.absoluteRotation();

      // absolutePosition() is already in the scene's canvas pixel space.
      // Adding half-canvas offsets shifts overlays to the bottom-right.
      this._positioner.style.left = `${pos.x}px`;
      this._positioner.style.top = `${pos.y}px`;
      this._positioner.style.transform = `rotate(${rot}deg) scale(${sc.x}, ${sc.y})`;
      this._container.style.opacity = String(this.absoluteOpacity());
      if (!this._didSyncDom) {
        this._container.style.visibility = "visible";
        this._didSyncDom = true;
      }
    }
    super.draw(context);
  }

}
