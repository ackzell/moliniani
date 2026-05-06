/**
 * Pretext layout engine registration.
 *
 * Exposes infrastructure for a Pretext-powered layout engine for future
 * text-around-shapes / variable-width-line features.
 * Text animation helpers live in `textAnimations.ts`.
 */

export interface TextLayoutLine {
  text: string;
  width: number;
}

export interface TextLayoutResult {
  lines: TextLayoutLine[];
  height: number;
  lineCount: number;
}

export interface TextLayoutInput {
  ctx: CanvasRenderingContext2D;
  text: string;
  font: string;
  maxWidth: number;
  lineHeight: number;
}

export type TextLayoutEngine = (input: TextLayoutInput) => TextLayoutResult;

let activeLayoutEngine: TextLayoutEngine | null = null;

export function setTextLayoutEngine(engine: TextLayoutEngine | null): void {
  activeLayoutEngine = engine;
}

export function getTextLayoutEngine(): TextLayoutEngine | null {
  return activeLayoutEngine;
}

/**
 * Dynamically loads `@chenglou/pretext` and registers it as the active layout
 * engine. Safe to call when the package is absent — returns `false` silently.
 */
export async function enablePretextLayout(): Promise<boolean> {
  const moduleName = "@chenglou/pretext";
  try {
    const mod = (await import(/* @vite-ignore */ moduleName)) as {
      prepareWithSegments: (text: string, font: string) => unknown;
      layoutWithLines: (
        prepared: unknown,
        maxWidth: number,
        lineHeight: number,
      ) => {
        lines: Array<{ text: string; width: number }>;
        height: number;
        lineCount: number;
      };
    };

    setTextLayoutEngine(({ text, font, maxWidth, lineHeight }) => {
      const prepared = mod.prepareWithSegments(text, font);
      return mod.layoutWithLines(prepared, maxWidth, lineHeight);
    });

    return true;
  } catch {
    return false;
  }
}
