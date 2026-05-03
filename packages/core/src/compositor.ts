type DrawElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => DOMMatrix | undefined;
  drawElement?: (element: Element, x: number, y: number) => DOMMatrix | undefined;
};

type LayoutSubtreeCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
};

const sceneHooks = new WeakSet<object>();
const sceneOverlayIds = new WeakMap<object, string>();
const sceneBridges = new WeakMap<object, LayoutSubtreeCanvas>();
let sceneOverlayCounter = 0;

export function getSceneOverlayId(scene: object): string {
  let id = sceneOverlayIds.get(scene);
  if (!id) {
    id = `moliniani-scene-${sceneOverlayCounter++}`;
    sceneOverlayIds.set(scene, id);
  }
  return id;
}

/**
 * Returns (creating if needed) the bridge canvas for a scene.
 * Vue overlay containers must be appended as DIRECT CHILDREN of this canvas
 * so the browser can paint them into cached paint records via `layoutsubtree`.
 * Exported so VueNode can mount into it.
 */
export function ensureBridgeCanvas(scene: object): LayoutSubtreeCanvas {
  let bridge = sceneBridges.get(scene) ?? null;
  if (!bridge) {
    bridge = document.createElement("canvas") as LayoutSubtreeCanvas;
    bridge.id = `moliniani-html-bridge-canvas-${getSceneOverlayId(scene)}`;
    bridge.setAttribute("layoutsubtree", "");
    // Must stay connected to the DOM layout tree for HTML-in-Canvas to work.
    // Keep it behind app content without opacity/transform tricks to avoid
    // introducing extra transform artifacts in drawn HTML output.
    bridge.style.cssText =
      "position:fixed;left:0;top:0;pointer-events:none;z-index:-1";
    document.body.appendChild(bridge);
    sceneBridges.set(scene, bridge);
  }
  return bridge;
}

/**
 * Ensure a scene has a single HTML-in-Canvas compositor hook.
 *
 * Each frame the hook:
 * 1. Resizes the bridge canvas to match the MC render canvas.
 * 2. Calls `bridge.requestPaint()` to force the browser to synchronously
 *    refresh the HTML paint state for all Vue overlays.
 * 3. Calls `drawElement` on each overlay to composite it into the
 *    bridge canvas 2D context.
 * 4. Blits the bridge canvas onto the MC render context.
 *
 * We subscribe to `scene.onRenderLifecycle` directly (not
 * `scene.lifecycleEvents.onAfterRender`) because LifecycleEvents clears all
 * subscribers on every scene reset — silently removing our hook. The raw
 * `onRenderLifecycle` dispatcher on GeneratorScene is never cleared.
 */
export function ensureHtmlInCanvasCompositor(scene: any): void {
  if (!scene || sceneHooks.has(scene)) return;
  sceneHooks.add(scene);

  // SceneRenderEvent.AfterRender === 3
  const AFTER_RENDER = 3;

  scene.onRenderLifecycle.subscribe(([event, context]: [number, CanvasRenderingContext2D]) => {
    if (event !== AFTER_RENDER) return;

    const bridge = ensureBridgeCanvas(scene);

    // Find all Vue overlay containers that are direct children of the bridge.
    const overlays = Array.from(
      bridge.querySelectorAll<HTMLElement>(":scope > [data-moliniani-overlay='true']"),
    ).filter((el) => el.isConnected);
    if (overlays.length === 0) return;

    const w = context.canvas.width;
    const h = context.canvas.height;

    // Resize bridge to match MC render canvas.
    // Changing width/height clears the 2D bitmap but HTML children remain in
    // the DOM and their paint records are refreshed by requestPaint().
    if (bridge.width !== w) bridge.width = w;
    if (bridge.height !== h) bridge.height = h;

    // Force paint for current frame before capture.
    bridge.requestPaint?.();

    const bridgeCtx = bridge.getContext("2d") as DrawElementImageContext | null;
    if (!bridgeCtx) return;

    // drawElementImage requires cached paint records and has been unstable here.
    // Prefer drawElement (live draw path) and do not fallback to drawElementImage.
    const draw =
      typeof bridgeCtx.drawElement === "function"
        ? bridgeCtx.drawElement.bind(bridgeCtx)
        : null;
    if (!draw) return;

    bridgeCtx.clearRect(0, 0, w, h);
    for (const overlay of overlays) {
      try {
        draw(overlay, 0, 0);
      } catch {
        // Paint record not yet available (e.g. first frame before browser paint).
        // Skip this overlay; it will be captured on the next frame.
      }
    }

    context.drawImage(bridge, 0, 0);
  });
}
