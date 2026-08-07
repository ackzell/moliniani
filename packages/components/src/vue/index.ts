import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import type { DefineComponent } from "vue";
import type { SplitUnitHandle, SplitUnitInitialValues } from "../SplitUnitHandle";
import type { UseSplitUnitsController } from "../useSplitUnits";
import { textEffectExtend } from "../textEffectNode";
import TypewriterSfc from "./Typewriter.gen";
import ScrambleTextSfc from "./ScrambleText.gen";
import GlowTextSfc from "./GlowText.gen";
import SplitTextSfc from "./SplitText.gen";
import RevealTextSfc from "./RevealText.gen";

export { AnimatedText } from "./AnimatedText";
export type { AnimatedTextProps, AnimatedTextInstance } from "./AnimatedText";
export type { SplitUnitHandle, SplitUnitInitialValues, SplitUnitType } from "../SplitUnitHandle";
export type { UseSplitUnitsController } from "../useSplitUnits";

export interface TypewriterProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  cursorColor?: string;
  cursorWidth?: number;
  cursorBlinkSpeed?: number;
}

// tsgo cannot resolve the `ComponentInstance<C>["$props"]` conditional that
// `defineVueNode` uses internally, so pin the props type explicitly.
const TypewriterSfcTyped = TypewriterSfc as unknown as DefineComponent<any, any, any>;

export const Typewriter: VueNodeConstructor<TypewriterProps> = defineVueNode(
  TypewriterSfcTyped,
  "Typewriter",
);

export interface ScrambleTextProps {
  text?: string;
  chars?: string;
  override?: string | boolean;
  ease?: string;
  from?: string | number;
  reversed?: boolean;
  cursor?: string | number | boolean;
  perturbation?: number;
  seed?: number;
  revealRate?: number;
  settleRate?: number;
  settleDuration?: number;
  revealDelay?: number;
  delay?: number;
  duration?: number;
  phase?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

const ScrambleTextSfcTyped = ScrambleTextSfc as unknown as DefineComponent<any, any, any>;

export const ScrambleText: VueNodeConstructor<ScrambleTextProps> = defineVueNode(
  ScrambleTextSfcTyped,
  "ScrambleText",
);

export interface GlowTextProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  glowColor?: string;
  glowRadius?: number;
  phase?: number;
}

const GlowTextSfcTyped = GlowTextSfc as unknown as DefineComponent<any, any, any>;

export const GlowText: VueNodeConstructor<GlowTextProps> = defineVueNode(
  GlowTextSfcTyped,
  "GlowText",
);

export interface SplitTextProps {
  text?: string;
  split?: string;
  /** Initial values applied to every split unit when it is (re)built. */
  unit?: Partial<SplitUnitInitialValues>;
  charClass?: string;
  wordClass?: string;
  lineClass?: string;
  debug?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  /** Extra animejs splitText() params (e.g. `{ chars: { wrap, clone } }`). */
  splitter?: Parameters<(typeof import("animejs"))["splitText"]>[1];
}

/**
 * Instance members `SplitText` exposes on the Motion Canvas node via
 * `defineVueNode()`'s `extend` factory — per-unit MC-signal handles that scenes
 * tween with `all()` / `sequence()` / `delay()`.
 */
export interface SplitTextInstance {
  /** All split unit handles, in DOM order. */
  readonly units: readonly SplitUnitHandle[];
  /** Handles for `data-char` units. */
  readonly chars: readonly SplitUnitHandle[];
  /** Handles for `data-word` units. */
  readonly words: readonly SplitUnitHandle[];
  /** Handles for `data-line` units. */
  readonly lines: readonly SplitUnitHandle[];
}

const EMPTY_UNITS: readonly SplitUnitHandle[] = Object.freeze([]);

const SplitTextSfcTyped = SplitTextSfc as unknown as DefineComponent<any, any, any>;

const extendSplitText = (
  Base: VueNodeConstructor<SplitTextProps>,
): VueNodeConstructor<SplitTextProps, SplitTextInstance> =>
  class SplitTextNode extends (Base as unknown as new (props: Record<string, any>) => any) {
    get units(): readonly SplitUnitHandle[] {
      return (this._controller as UseSplitUnitsController | null)?.units ?? EMPTY_UNITS;
    }
    get chars(): readonly SplitUnitHandle[] {
      return (this._controller as UseSplitUnitsController | null)?.chars ?? EMPTY_UNITS;
    }
    get words(): readonly SplitUnitHandle[] {
      return (this._controller as UseSplitUnitsController | null)?.words ?? EMPTY_UNITS;
    }
    get lines(): readonly SplitUnitHandle[] {
      return (this._controller as UseSplitUnitsController | null)?.lines ?? EMPTY_UNITS;
    }
  } as unknown as VueNodeConstructor<SplitTextProps, SplitTextInstance>;

export const SplitText: VueNodeConstructor<SplitTextProps, SplitTextInstance> = defineVueNode<
  typeof SplitTextSfcTyped,
  SplitTextInstance
>(SplitTextSfcTyped, "SplitText", extendSplitText);

export interface RevealTextProps {
  text?: string;
  split?: string;
  rise?: number;
  blur?: number;
  stagger?: number;
  duration?: number;
  /** Whole reveal timeline in ms; tweening `phase(1, seconds)` records it. */
  total?: number;
  ease?: string;
  phase?: number;
  exit?: number;
  exitDuration?: number;
  exitStagger?: number;
  exitTotal?: number;
  exitEase?: string;
  exitRise?: number;
  exitX?: number;
  exitBlur?: number;
  exitScale?: number;
  exitOpacity?: number;
  exitStaggerMode?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

const RevealTextSfcTyped = RevealTextSfc as unknown as DefineComponent<any, any, any>;

export const RevealText: VueNodeConstructor<RevealTextProps> = defineVueNode(
  RevealTextSfcTyped,
  "RevealText",
  textEffectExtend(true),
);
