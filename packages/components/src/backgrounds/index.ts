import { FlowFieldBackground } from "./flow-field/background";
import { GroovySquaresBackground } from "./groovy-squares/background";
import { SugarGlassBackground } from "./sugar-glass/background";
import { TopographicBackground } from "./topographic/background";

export {
  FlowFieldBackground,
  GroovySquaresBackground,
  SugarGlassBackground,
  TopographicBackground,
};

/**
 * Every built-in dynamic background, keyed by a stable id. Use this to discover
 * what ships out of the box (`backgroundCatalog.` autocompletes the ids) or to
 * enumerate them at runtime (`Object.values(backgroundCatalog)`).
 */
export const backgroundCatalog = {
  groovySquares: GroovySquaresBackground,
  flowField: FlowFieldBackground,
  topographic: TopographicBackground,
  sugarGlass: SugarGlassBackground,
} as const;
