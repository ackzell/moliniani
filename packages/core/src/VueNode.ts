// packages/core/src/VueNode.ts
import { Layout, type LayoutProps } from "@motion-canvas/2d";
import { createApp, h, reactive, type App, type Component } from "@vue/runtime-dom";
import { useScene, Color, type ColorSignal, type SimpleSignal } from "@motion-canvas/core";
import { ensureBridgeCanvas, ensureHtmlInCanvasCompositor, getSceneOverlayId } from "./compositor";
import { molinianiDebugLog } from "./debug";

/**
 * NodeProps keys that belong to Motion Canvas — not passed to Vue as props.
 *
 * `opacity` is intentionally in this list: it is handled by MC's own
 * Node.opacity signal so that `yield* node.opacity(0, 0.5)` lives on the
 * virtual timeline and scrubs correctly in both directions, exactly like
 * any native MC node (Rect, Circle, etc.).
 *
 * Exported so TresNode can reuse it without duplicating the list.
 */
export const KNOWN_NODE_KEYS = new Set<string>([
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

export class VueNode<P extends Record<string, any> = {}> extends Layout {
  private _app: App | null = null;
  private _container: HTMLElement | null = null;
  private _positioner: HTMLElement | null = null;
  private _didSyncDom = false;
  private _lastFrame: number | null = null;

  /**
   * Reactive Vue prop state. Each frame, numeric prop values are written here
   * from _propSignals so that Vue re-renders with the correct frame value.
   */
  readonly _vueState: P;

  /**
   * MC `SimpleSignal` for each numeric Vue-specific prop, created by
   * `defineVueNode`. Signals live on MC's virtual timeline so tweening,
   * seeking, and scrubbing in both directions work identically to native nodes.
   */
  readonly _propSignals = new Map<string, SimpleSignal<number>>();

  /**
   * MC `SimpleSignal<Color>` for each CSS-color Vue prop, created by
   * `defineVueNode`. Serialized to a CSS string each frame in `_syncDom()`.
   */
  readonly _colorSignals = new Map<string, ColorSignal<void>>();

  /**
   * MC `SimpleSignal<string>` for each plain-string Vue prop, created by
   * `defineVueNode`. Written into Vue reactive state each frame in `_syncDom()`.
   */
  readonly _stringSignals = new Map<string, SimpleSignal<string>>();

  private readonly _nodeId: string;
  private readonly _component: Component;
  private readonly _scene: any;

  constructor(props: LayoutProps & P, component: Component) {
    super(props);

    this._nodeId = `moliniani-node-${nodeCounter++}`;
    this._component = component;
    this._scene = useScene() as any;

    // Strip MC-owned keys; pass only Vue-specific props into reactive state.
    // opacity is excluded — it lives on Node.opacity (MC signal).
    const vueProps = Object.fromEntries(
      Object.entries(props).filter(([k]) => !KNOWN_NODE_KEYS.has(k)),
    ) as P;

    this._vueState = reactive({ ...vueProps }) as P;
    this._mountVue();
  }

  private _mountVue(): void {
    const existing = document.getElementById(this._nodeId);
    if (existing) existing.remove();

    const scene = this._scene;
    ensureHtmlInCanvasCompositor(scene);
    this._createDom();
  }

  private _createDom(): void {
    const scene = this._scene;

    // _container: full-canvas div, direct child of the bridge canvas that has
    //   the `layoutsubtree` attribute Chrome needs for drawElement() records.
    // _positioner: translated to the node's MC world position each frame.
    this._container = document.createElement("div");
    this._container.id = this._nodeId;
    this._container.dataset.molinianiOverlay = "true";
    this._container.dataset.molinianiScene = getSceneOverlayId(scene);
    this._container.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none";

    this._positioner = document.createElement("div");
    // Motion Canvas absolutePosition() is already in viewport/canvas space,
    // so place the DOM node at that point and offset by its own size to match
    // the default centred origin of native MC nodes.
    this._positioner.style.cssText =
      "position:absolute;left:0;top:0;transform:translate(-100000px,-100000px);transform-origin:center center;pointer-events:none";

    this._container.appendChild(this._positioner);

    const bridge = ensureBridgeCanvas(scene);
    bridge.appendChild(this._container);

    const state = this._vueState;
    this._app = createApp({ render: () => h(this._component, state) });
    this._app.mount(this._positioner);
  }

  private _cleanupDom(): void {
    this._app?.unmount();
    this._container?.remove();
    this._app = null;
    this._container = null;
    this._positioner = null;
    this._didSyncDom = false;
  }

  public override dispose(): void {
    this._cleanupDom();
    super.dispose();
  }

  private _syncDom(): void {
    if (!this._container || !this._positioner) return;

    const pos = this.absolutePosition();
    const sc = this.absoluteScale();
    const rot = this.absoluteRotation();
    const frame = this._scene?.playback?.frame;

    this._positioner.style.left = `${pos.x}px`;
    this._positioner.style.top = `${pos.y}px`;
    this._positioner.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${sc.x}, ${sc.y})`;

    // Store opacity as a data attribute so the compositor can apply it as
    // context.globalAlpha — the same mechanism MC uses for canvas nodes.
    // CSS opacity is unreliable with drawElement because the browser may not
    // have run style recalculation before the paint snapshot is taken.
    this._container.dataset.molinianiOpacity = String(this.absoluteOpacity());

    // Push each signal's current frame value into Vue reactive state so the
    // component re-renders with the correct animated value.
    for (const [key, signal] of this._propSignals) {
      (this._vueState as Record<string, any>)[key] = signal();
    }

    // Serialize color signals to CSS strings so Vue sees valid color values.
    for (const [key, signal] of this._colorSignals) {
      const color = signal();
      (this._vueState as Record<string, any>)[key] =
        color && typeof (color as { serialize?: () => string }).serialize === "function"
          ? (color as { serialize: () => string }).serialize()
          : new Color(color as any).serialize();
    }

    // Push string signal values into Vue reactive state.
    for (const [key, signal] of this._stringSignals) {
      (this._vueState as Record<string, any>)[key] = signal();
    }

    if (typeof frame === "number") {
      if (this._lastFrame !== null && frame < this._lastFrame) {
        molinianiDebugLog("Backward frame jump in VueNode", {
          nodeId: this._nodeId,
          from: this._lastFrame,
          to: frame,
          pos: { x: pos.x, y: pos.y },
          rot,
          scale: { x: sc.x, y: sc.y },
          opacity: this.absoluteOpacity(),
        });
      }
      this._lastFrame = frame;
    }

    if (!this._didSyncDom) {
      this._didSyncDom = true;
      molinianiDebugLog("VueNode first sync", {
        nodeId: this._nodeId,
        frame,
        pos: { x: pos.x, y: pos.y },
        rot,
        scale: { x: sc.x, y: sc.y },
        opacity: this.absoluteOpacity(),
      });
    }
  }

  public override render(context: CanvasRenderingContext2D): void {
    // _syncDom lives in render(), not draw(), so it runs every frame even when
    // MC's cache / opacity optimisations skip draw().
    this._syncDom();
    super.render(context);
  }

  protected override draw(context: CanvasRenderingContext2D): void {
    super.draw(context);
  }
}
