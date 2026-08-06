type DrawElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => DOMMatrix | undefined;
  drawElement?: (element: Element, x: number, y: number) => DOMMatrix | undefined;
};

type LayoutSubtreeCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
};

import { molinianiDebugLog } from "./debug";
import { DependencyContext } from "@motion-canvas/core";

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
    bridge.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:-1";
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
  const sceneId = getSceneOverlayId(scene);
  let lastFrame: number | null = null;
  let requestedRetryFrame: number | null = null;

  // SceneRenderEvent.AfterRender === 3
  const AFTER_RENDER = 3;

  scene.onRenderLifecycle.subscribe(([event, context]: [number, CanvasRenderingContext2D]) => {
    if (event !== AFTER_RENDER) return;
    const frame = scene?.playback?.frame;

    let backwardJump = false;
    if (typeof frame === "number") {
      if (lastFrame !== null && frame < lastFrame) {
        backwardJump = true;
        molinianiDebugLog("Backward frame jump in compositor", {
          sceneId,
          from: lastFrame,
          to: frame,
        });
      }
      lastFrame = frame;
      if (requestedRetryFrame !== frame) {
        requestedRetryFrame = null;
      }
    }

    const bridge = ensureBridgeCanvas(scene);

    // Find all Vue overlay containers that are direct children of the bridge.
    const overlays = Array.from(
      bridge.querySelectorAll<HTMLElement>(":scope > [data-moliniani-overlay='true']"),
    ).filter((el) => el.isConnected && el.dataset.molinianiScene === sceneId);
    if (overlays.length === 0) {
      molinianiDebugLog("No overlays for scene in compositor pass", { sceneId, frame });
      return;
    }

    const w = context.canvas.width;
    const h = context.canvas.height;

    // Resize bridge to match MC render canvas.
    // Changing width/height clears the 2D bitmap but HTML children remain in
    // the DOM and their paint records are refreshed by requestPaint().
    if (bridge.width !== w) bridge.width = w;
    if (bridge.height !== h) bridge.height = h;
    if (bridge.style.width !== `${w}px`) bridge.style.width = `${w}px`;
    if (bridge.style.height !== `${h}px`) bridge.style.height = `${h}px`;

    // Force paint for current frame before capture.
    bridge.requestPaint?.();

    const bridgeCtx = bridge.getContext("2d") as DrawElementImageContext | null;
    if (!bridgeCtx) return;

    const draw =
      typeof bridgeCtx.drawElement === "function" ? bridgeCtx.drawElement.bind(bridgeCtx) : null;
    const drawImage =
      typeof bridgeCtx.drawElementImage === "function"
        ? bridgeCtx.drawElementImage.bind(bridgeCtx)
        : null;
    if (!draw && !drawImage) return;

    // Seek/scrub jumps may render only a single frame. drawElement can fail on
    // that exact frame if the browser hasn't materialised paint records yet.
    // Retry a couple of times in-frame with requestPaint() to improve
    // determinism when jumping backward/forward to arbitrary frames.
    let lastPassFailures = 0;
    for (let pass = 0; pass < 3; pass++) {
      let missingAny = false;
      let failures = 0;
      bridgeCtx.clearRect(0, 0, w, h);

      for (const overlay of overlays) {
        // Apply opacity as globalAlpha — the same mechanism MC uses for
        // canvas nodes.
        const opacity = parseFloat(overlay.dataset["molinianiOpacity"] ?? "1");
        bridgeCtx.save();
        bridgeCtx.globalAlpha = opacity;

        let captured = false;
        if (draw) {
          try {
            draw(overlay, 0, 0);
            captured = true;
          } catch {
            // Try drawElementImage fallback below.
          }
        }

        if (!captured && drawImage) {
          try {
            drawImage(overlay, 0, 0);
            captured = true;
          } catch {
            // Count as missing only if both capture paths fail.
          }
        }

        bridgeCtx.restore();

        if (!captured) {
          missingAny = true;
          failures++;
        }
      }
      lastPassFailures = failures;

      if (!missingAny) {
        if (pass > 0) {
          molinianiDebugLog("Compositor recovered after retry", {
            sceneId,
            frame,
            pass,
            overlays: overlays.length,
          });
        }
        break;
      }

      bridge.requestPaint?.();
    }

    if (lastPassFailures > 0) {
      molinianiDebugLog("Compositor overlays missing after retries", {
        sceneId,
        frame,
        overlays: overlays.length,
        failures: lastPassFailures,
      });
    }

    // A frame rendered once only captures the DOM Vue committed in its *previous*
    // microtask flush: VueNode writes this frame's values into reactive state
    // during render(), but Vue re-renders the SFC template asynchronously, after
    // the current render pass. During live playback the next frame naturally
    // captures the flushed DOM, so the one-flush lag is invisible. A backward
    // scrub re-renders an earlier frame exactly once and captures that stale,
    // later DOM instead — the previous phrase can be "already back" or the next
    // one "already fully in" on the wrong frame. On a backward jump, request one
    // extra render iteration after the browser processes Vue's flush so the
    // captured overlay reflects the frame we actually asked for.
    const needsExtraRender =
      lastPassFailures > 0 ||
      (typeof frame === "number" && backwardJump && requestedRetryFrame !== frame);

    if (needsExtraRender && typeof frame === "number") {
      if (requestedRetryFrame !== frame) {
        requestedRetryFrame = frame;
        DependencyContext.collectPromise(
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          }),
        );
        molinianiDebugLog("Requested extra render iteration after capture", {
          sceneId,
          frame,
          reason: lastPassFailures > 0 ? "capture-miss" : "backward-scrub",
        });
      }
    } else if (typeof frame === "number") {
      requestedRetryFrame = null;
    }

    context.drawImage(bridge, 0, 0);
  });
}
