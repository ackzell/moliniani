// packages/core/src/TresNode.ts
//
// TresNode: a Motion Canvas Layout subclass that mounts a TresJS Vue SFC as a
// 3D scene node. The compositor path is:
//
//   MC signal tween → _syncState() writes to Vue reactive props
//   → TresJS custom renderer updates Three.js objects (next Vue flush, ~1 frame lag)
//   → renderer.instance.render(scene, camera) called synchronously in draw()
//   → context.drawImage(renderer.domElement, ...) blits onto MC canvas
//
// The ~1-frame Vue reactivity lag is imperceptible at 60 fps for smooth tweens.
// For pixel-perfect sync on the first frame, set initial prop values directly
// as constructor props (they are passed into the TresJS scene on first mount).
//
// The user's SFC is the scene CONTENT (camera + lights + meshes). TresNode
// wraps it in <TresCanvas renderMode="manual"> internally — do NOT include
// <TresCanvas> in your SFC.

import { jsx, Layout, type LayoutProps } from "@motion-canvas/2d";
import { createApp, h, reactive, nextTick, type App, type Component } from "@vue/runtime-dom";
import {
  createSignal,
  Color,
  useScene,
  DependencyContext,
  type ColorSignal,
  type SimpleSignal,
} from "@motion-canvas/core";
import { TresCanvas } from "@tresjs/core";
import type { TresContext } from "@tresjs/core";
import type { WebGLRenderer } from "three";
import type { DefineComponent, ComponentInstance } from "vue";
import type { Reference } from "@motion-canvas/core";
import type { Node } from "@motion-canvas/2d";
import { KNOWN_NODE_KEYS } from "./VueNode";
import type { VueNodeConstructor } from "./types";
import { molinianiDebugLog } from "./debug";

let tresNodeCounter = 0;

function isCSSColor(value: string): boolean {
  try {
    new Color(value);
    return true;
  } catch {
    return false;
  }
}

// Minimal structural alias for the parts of TresContext we access in draw().
// Using a structural type means we don't depend on TresJS's exact export shape.
interface TresCtx {
  scene: { value: object };
  camera: { activeCamera: { value: object | null } };
  renderer: {
    instance: WebGLRenderer;
    loop: { stop(): void };
  };
}

export class TresNode<P extends Record<string, any> = {}> extends Layout {
  private _app: App | null = null;
  private _container: HTMLElement | null = null;
  private _tresCtx: TresCtx | null = null;
  private _lastScene: object | null = null;
  private _lastCamera: object | null = null;
  private _lastFrame: number | null = null;
  private _onReadyFired: boolean = false;
  private readonly _nodeId: string = "";
  private readonly _scene: any;

  readonly _vueState: P = {} as P;
  readonly _propSignals = new Map<string, SimpleSignal<number>>();
  readonly _colorSignals = new Map<string, ColorSignal<void>>();
  readonly _stringSignals = new Map<string, SimpleSignal<string>>();

  private readonly _component: Component = null as any;

  private isNativeMcSignalKey(key: string): boolean {
    const existing = (this as Record<string, any>)[key];
    return typeof existing === "function" && !!existing.context;
  }

  constructor(props: LayoutProps & P, component: Component) {
    super(props);
    this._nodeId = `moliniani-tres-node-${tresNodeCounter++}`;
    this._component = component;
    this._scene = useScene() as any;

    const vueProps = Object.fromEntries(
      Object.entries(props).filter(
        ([k]) => !KNOWN_NODE_KEYS.has(k) && !this.isNativeMcSignalKey(k),
      ),
    ) as P;

    this._vueState = reactive({ ...vueProps }) as P;
    this._mountTres();
  }

  private _mountTres(): void {
    // Keep the container in the DOM but invisible so that TresCanvas's resize
    // observer has a valid layout target and the WebGL context stays alive.
    this._container = document.createElement("div");
    this._container.style.cssText =
      "position:fixed;left:-9999px;top:0;width:960px;height:540px;visibility:hidden;pointer-events:none";
    document.body.appendChild(this._container);

    const state = this._vueState;

    this._app = createApp({
      render: () =>
        h(
          TresCanvas,
          {
            // Manual mode: TresJS won't start its own RAF loop. We drive
            // rendering from draw() via renderer.instance.render() directly.
            renderMode: "manual",
            alpha: true,
            // Transparent background without triggering TresJS warning:
            // use opaque clearColor + clearAlpha=0 (not color-with-alpha).
            clearColor: "#000000",
            clearAlpha: 0,
            // Required: the WebGL back-buffer must survive until drawImage()
            // copies it onto the MC canvas in the same synchronous draw() call.
            preserveDrawingBuffer: true,
            onReady: (ctx: TresContext) => {
              console.log(`[TresNode] TresJS onReady callback - nodeId: ${this._nodeId}`);
              this._tresCtx = ctx as unknown as TresCtx;
              this._onReadyFired = true;
            },
            onError: (error: any) => {
              console.error(`[TresNode] TresJS error - nodeId: ${this._nodeId}:`, error);
            },
          },
          // The user's SFC is the scene content (camera, lights, meshes).
          // TresJS's custom renderer handles TresXxx components as Three.js
          // scene graph nodes automatically.
          () => h(this._component as any, state),
        ),
    });

    this._app.mount(this._container);
  }

  // Push current signal values into Vue reactive state so TresJS reactive
  // watchers can update Three.js object properties before the next render.
  private _syncState(): void {
    const frame = this._scene?.playback?.frame;
    let isBackward = false;

    // Detect backward frame jumps for debugging and proper state synchronization
    if (typeof frame === "number") {
      if (this._lastFrame !== null && frame < this._lastFrame) {
        isBackward = true;
        console.log(
          `[TresNode] Backward frame jump detected - nodeId: ${this._nodeId}, from: ${this._lastFrame}, to: ${frame}`,
        );
        molinianiDebugLog("Backward frame jump in TresNode", {
          nodeId: this._nodeId,
          from: this._lastFrame,
          to: frame,
        });
      }
      this._lastFrame = frame;
    }

    // Update all signals with proper reactivity handling
    for (const [key, signal] of this._propSignals) {
      const value = signal();
      if (isBackward) {
        // Force Vue reactivity during backward seeking by using a temporary different value
        (this._vueState as Record<string, any>)[key] = value + 0.0001; // Tiny change to force reactivity
        nextTick(() => {
          (this._vueState as Record<string, any>)[key] = value;
        });
      } else {
        (this._vueState as Record<string, any>)[key] = value;
      }
    }

    for (const [key, signal] of this._colorSignals) {
      const color = signal();
      const serializedColor =
        color && typeof (color as { serialize?: () => string }).serialize === "function"
          ? (color as { serialize: () => string }).serialize()
          : new Color(color as any).serialize();

      if (isBackward) {
        // Force Vue reactivity during backward seeking by temporarily changing the color
        (this._vueState as Record<string, any>)[key] = "#000000"; // Temporary different color
        nextTick(() => {
          (this._vueState as Record<string, any>)[key] = serializedColor;
        });
      } else {
        (this._vueState as Record<string, any>)[key] = serializedColor;
      }
    }

    for (const [key, signal] of this._stringSignals) {
      const value = signal();
      if (isBackward) {
        // Force Vue reactivity during backward seeking by temporarily changing the string
        (this._vueState as Record<string, any>)[key] = value + "_temp"; // Temporary suffix
        nextTick(() => {
          (this._vueState as Record<string, any>)[key] = value;
        });
      } else {
        (this._vueState as Record<string, any>)[key] = value;
      }
    }
  }

  public override render(context: CanvasRenderingContext2D): void {
    // _syncState lives in render(), not draw(), so it runs every frame even when
    // MC's cache / opacity optimisations skip draw().
    this._syncState();
    super.render(context);
  }

  protected override draw(context: CanvasRenderingContext2D): void {
    const frame = this._scene?.playback?.frame;
    console.log(
      `[TresNode] draw called - nodeId: ${this._nodeId}, frame: ${frame}, onReadyFired: ${this._onReadyFired}`,
    );

    const ctx = this._tresCtx;
    const r = ctx?.renderer.instance;
    const currentScene = ctx?.scene.value ?? null;
    const currentCamera = ctx?.camera.activeCamera.value ?? null;

    console.log(
      `[TresNode] Context ready: ${!!ctx}, renderer ready: ${!!r}, scene: ${!!currentScene}, camera: ${!!currentCamera}, nodeId: ${this._nodeId}`,
    );

    if (currentScene) this._lastScene = currentScene;
    if (currentCamera) this._lastCamera = currentCamera;
    const scene = currentScene ?? this._lastScene;
    const camera = currentCamera ?? this._lastCamera;

    // Only render if we have all required components
    let rendered = false;
    if (ctx && r && scene && camera) {
      const w = this.width();
      const h = this.height();

      if (w > 0 && h > 0) {
        r.setSize(w, h, false);
        r.render(scene as any, camera as any);
        context.drawImage(r.domElement, w / -2, h / -2, w, h);
        rendered = true;
        console.log(`[TresNode] Rendered successfully - nodeId: ${this._nodeId}`);
      }
    }

    // If rendering failed because TresJS context isn't ready, keep requesting render iterations
    // until it becomes ready (no frame-based limit to handle rapid backward scrubbing)
    if (!rendered && !this._onReadyFired) {
      console.log(
        `[TresNode] Requesting extra render iteration - nodeId: ${this._nodeId}, frame: ${frame}, onReadyFired: ${this._onReadyFired}`,
      );
      DependencyContext.collectPromise(
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
      );
    }

    super.draw(context);
  }

  public override dispose(): void {
    this._tresCtx?.renderer.loop.stop();
    this._app?.unmount();
    this._container?.remove();
    this._app = null;
    this._container = null;
    this._tresCtx = null;
    super.dispose();
  }
}

/**
 * Creates a Motion Canvas node class for a TresJS scene SFC.
 *
 * The SFC should contain only the Three.js scene content — camera, lights and
 * meshes as TresJS components. Do NOT include `<TresCanvas>` in the SFC;
 * TresNode provides the canvas.
 *
 * All numeric, color, and string props declared by the SFC become MC signals
 * on the returned class, meaning they can be tweened on the MC timeline:
 *
 * ```tsx
 * import TresBoxSFC from '../components/TresBox.vue'
 * import { defineTresNode } from '@moliniani/core'
 * import { createRef } from '@motion-canvas/core'
 *
 * const TresBox = defineTresNode(TresBoxSFC)
 * const boxRef = createRef<InstanceType<typeof TresBox>>()
 *
 * view.add(<TresBox ref={boxRef} rotationY={0} color="#4488ff" width={600} height={400} />)
 * yield* boxRef().rotationY(Math.PI * 2, 3, easeInOutCubic)
 * ```
 */
export function defineTresNode<C extends DefineComponent<any, any, any>>(
  sfc: C,
): VueNodeConstructor<ComponentInstance<C>["$props"]> {
  if ((sfc as any).__mnTresWrapped) {
    return sfc as unknown as VueNodeConstructor<ComponentInstance<C>["$props"]>;
  }

  type P = ComponentInstance<C>["$props"];

  class DefinedTresNode extends TresNode<P> {
    constructor(props: LayoutProps & P) {
      super(props, sfc);

      for (const key in this._vueState) {
        const initial = (this._vueState as Record<string, any>)[key];

        if (typeof initial === "number") {
          const existing = (this as Record<string, any>)[key] as SimpleSignal<number> | undefined;

          if (typeof existing === "function" && existing.context) {
            // Reuse native MC signal (e.g. width/height inherited from Layout).
            this._propSignals.set(key, existing);
          } else {
            const signal = createSignal(initial);
            this._propSignals.set(key, signal);
            (this as Record<string, any>)[key] = signal;
          }
        } else if (typeof initial === "string" && isCSSColor(initial)) {
          const signal = Color.createSignal(initial);
          this._colorSignals.set(key, signal);
          (this as Record<string, any>)[key] = signal;
        } else if (typeof initial === "string") {
          const signal = createSignal(initial);
          this._stringSignals.set(key, signal);
          (this as Record<string, any>)[key] = signal;
        }
      }
    }
  }

  (DefinedTresNode as any).prototype.isClass = true;
  (DefinedTresNode as any).__mnTresWrapped = true;

  return DefinedTresNode as unknown as VueNodeConstructor<P>;
}

type TresNodeProps<P> = Omit<LayoutProps, "ref"> & P;

/**
 * Places a TresJS scene SFC as a node in the Motion Canvas scene graph.
 *
 * Analogous to `mnVue()` but creates a `TresNode` (WebGL → `drawImage`)
 * instead of a `VueNode` (HTML → `drawElement`).
 *
 * ```tsx
 * import TresBox from '../components/TresBox.vue'
 * import { createRef } from '@motion-canvas/core'
 *
 * const boxRef = createRef<InstanceType<ReturnType<typeof defineTresNode<typeof TresBox>>>>()
 * view.add(mnTres(TresBox, boxRef, { rotationY: 0, color: '#4488ff', width: 700, height: 500 }))
 * yield* boxRef().rotationY(Math.PI * 2, 3, easeInOutCubic)
 * ```
 */
export function mnTres<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
  props?: TresNodeProps<P>,
): Node;
export function mnTres<P extends Record<string, any>>(
  cls: VueNodeConstructor<P>,
  ref: Reference<InstanceType<VueNodeConstructor<P>>>,
  props?: TresNodeProps<P>,
): Node;
export function mnTres<C extends DefineComponent<any, any, any>>(
  sfc: C,
  props?: TresNodeProps<ComponentInstance<C>["$props"]>,
): Node;
export function mnTres<C extends DefineComponent<any, any, any>>(
  sfc: C,
  ref: Reference<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>,
  props?: TresNodeProps<ComponentInstance<C>["$props"]>,
): Node;
export function mnTres(
  sfc: any,
  refOrProps?: Reference<any> | Record<string, any>,
  maybeProps?: Record<string, any>,
): Node {
  // If the Moliniani Vite plugin already wrapped this .vue import as a VueNode,
  // recover the original SFC so TresJS's Vue renderer can mount it correctly.
  const rawSfc = (sfc as any).__mnWrapped ? ((sfc as any).__mnOriginalSFC ?? sfc) : sfc;
  const cls = (rawSfc as any).__mnTresWrapped ? rawSfc : defineTresNode(rawSfc);
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
