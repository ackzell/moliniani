import { Node } from "@motion-canvas/2d";
import { loop, tween, type ThreadGenerator } from "@motion-canvas/core";

export interface FloatConfig {
  /** Peak offset in pixels above/below the node's rest position. */
  amplitude?: number;
  /** Seconds per full up-down cycle. */
  period?: number;
  /** Radians offset into the sine wave. */
  phase?: number;
}

/**
 * Bobs a node up and down on the virtual timeline forever.
 *
 * ```tsx
 * const badge = createRef<Rect>();
 * view.add(<Rect ref={badge} fill="#f00" width={40} height={40} />);
 *
 * yield* floatIt(badge(), { amplitude: 20, period: 2 });
 * ```
 */
export function* floatIt(node: Node, config: FloatConfig = {}): ThreadGenerator {
  const { amplitude = 10, period = 2, phase = 0 } = config;

  yield* loop(Infinity, function* () {
    yield* tween(period, (t) => {
      node.position.y(Math.sin(t * Math.PI * 2 + phase) * amplitude);
    });
  });
}
