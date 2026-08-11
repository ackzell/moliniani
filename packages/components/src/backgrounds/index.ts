import { FlowFieldBackground } from "./flow-field/background";
import { GroovySquaresBackground } from "./groovy-squares/background";

export { FlowFieldBackground, GroovySquaresBackground };

/**
 * Every built-in dynamic background, keyed by a stable id. Use this to discover
 * what ships out of the box (`backgroundCatalog.` autocompletes the ids) or to
 * enumerate them at runtime (`Object.values(backgroundCatalog)`).
 */
export const backgroundCatalog = {
  groovySquares: GroovySquaresBackground,
  flowField: FlowFieldBackground,
} as const;
