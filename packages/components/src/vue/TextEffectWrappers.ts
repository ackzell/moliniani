// Generated once by scripts/gen-text-effect-sfcs.mjs — edit the SFCs directly.
// Wraps the compiled text-effect SFCs with defineVueNode() so they work as MC
// nodes. The Typewriter and ShimmerSweep effects are hand-authored below this
// file in src/vue/index.ts.
import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import type { DefineComponent } from "vue";
import PerCharacterRiseSfc from "./PerCharacterRise.gen";
import PerWordCrossfadeSfc from "./PerWordCrossfade.gen";
import SpringScaleInSfc from "./SpringScaleIn.gen";
import MaskRevealUpSfc from "./MaskRevealUp.gen";
import LineByLineSlideSfc from "./LineByLineSlide.gen";
import MicroScaleFadeSfc from "./MicroScaleFade.gen";
import FadeThroughSfc from "./FadeThrough.gen";
import SharedAxisYSfc from "./SharedAxisY.gen";
import SharedAxisZSfc from "./SharedAxisZ.gen";
import BlurOutUpSfc from "./BlurOutUp.gen";
import ScaleDownFadeSfc from "./ScaleDownFade.gen";
import FocusBlurResolveSfc from "./FocusBlurResolve.gen";
import BottomUpLettersSfc from "./BottomUpLetters.gen";
import TopDownLettersSfc from "./TopDownLetters.gen";
import DepthParallaxWordsSfc from "./DepthParallaxWords.gen";
import SharedAxisXSfc from "./SharedAxisX.gen";
import StaggerFromCenterSfc from "./StaggerFromCenter.gen";
import StaggerFromEdgesSfc from "./StaggerFromEdges.gen";
import KineticCenterBuildSfc from "./KineticCenterBuild.gen";
import ShortSlideDownSfc from "./ShortSlideDown.gen";
import ShortSlideRightSfc from "./ShortSlideRight.gen";

export interface PerCharacterRiseProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const PerCharacterRiseSfcTyped = PerCharacterRiseSfc as unknown as DefineComponent<any, any, any>;

export const PerCharacterRise: VueNodeConstructor<PerCharacterRiseProps> = defineVueNode(
  PerCharacterRiseSfcTyped,
  "PerCharacterRise",
);

export interface PerWordCrossfadeProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const PerWordCrossfadeSfcTyped = PerWordCrossfadeSfc as unknown as DefineComponent<any, any, any>;

export const PerWordCrossfade: VueNodeConstructor<PerWordCrossfadeProps> = defineVueNode(
  PerWordCrossfadeSfcTyped,
  "PerWordCrossfade",
);

export interface SpringScaleInProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const SpringScaleInSfcTyped = SpringScaleInSfc as unknown as DefineComponent<any, any, any>;

export const SpringScaleIn: VueNodeConstructor<SpringScaleInProps> = defineVueNode(
  SpringScaleInSfcTyped,
  "SpringScaleIn",
);

export interface MaskRevealUpProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const MaskRevealUpSfcTyped = MaskRevealUpSfc as unknown as DefineComponent<any, any, any>;

export const MaskRevealUp: VueNodeConstructor<MaskRevealUpProps> = defineVueNode(
  MaskRevealUpSfcTyped,
  "MaskRevealUp",
);

export interface LineByLineSlideProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const LineByLineSlideSfcTyped = LineByLineSlideSfc as unknown as DefineComponent<any, any, any>;

export const LineByLineSlide: VueNodeConstructor<LineByLineSlideProps> = defineVueNode(
  LineByLineSlideSfcTyped,
  "LineByLineSlide",
);

export interface MicroScaleFadeProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const MicroScaleFadeSfcTyped = MicroScaleFadeSfc as unknown as DefineComponent<any, any, any>;

export const MicroScaleFade: VueNodeConstructor<MicroScaleFadeProps> = defineVueNode(
  MicroScaleFadeSfcTyped,
  "MicroScaleFade",
);

export interface FadeThroughProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const FadeThroughSfcTyped = FadeThroughSfc as unknown as DefineComponent<any, any, any>;

export const FadeThrough: VueNodeConstructor<FadeThroughProps> = defineVueNode(
  FadeThroughSfcTyped,
  "FadeThrough",
);

export interface SharedAxisYProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const SharedAxisYSfcTyped = SharedAxisYSfc as unknown as DefineComponent<any, any, any>;

export const SharedAxisY: VueNodeConstructor<SharedAxisYProps> = defineVueNode(
  SharedAxisYSfcTyped,
  "SharedAxisY",
);

export interface SharedAxisZProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const SharedAxisZSfcTyped = SharedAxisZSfc as unknown as DefineComponent<any, any, any>;

export const SharedAxisZ: VueNodeConstructor<SharedAxisZProps> = defineVueNode(
  SharedAxisZSfcTyped,
  "SharedAxisZ",
);

export interface BlurOutUpProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const BlurOutUpSfcTyped = BlurOutUpSfc as unknown as DefineComponent<any, any, any>;

export const BlurOutUp: VueNodeConstructor<BlurOutUpProps> = defineVueNode(
  BlurOutUpSfcTyped,
  "BlurOutUp",
);

export interface ScaleDownFadeProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const ScaleDownFadeSfcTyped = ScaleDownFadeSfc as unknown as DefineComponent<any, any, any>;

export const ScaleDownFade: VueNodeConstructor<ScaleDownFadeProps> = defineVueNode(
  ScaleDownFadeSfcTyped,
  "ScaleDownFade",
);

export interface FocusBlurResolveProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const FocusBlurResolveSfcTyped = FocusBlurResolveSfc as unknown as DefineComponent<any, any, any>;

export const FocusBlurResolve: VueNodeConstructor<FocusBlurResolveProps> = defineVueNode(
  FocusBlurResolveSfcTyped,
  "FocusBlurResolve",
);

export interface BottomUpLettersProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const BottomUpLettersSfcTyped = BottomUpLettersSfc as unknown as DefineComponent<any, any, any>;

export const BottomUpLetters: VueNodeConstructor<BottomUpLettersProps> = defineVueNode(
  BottomUpLettersSfcTyped,
  "BottomUpLetters",
);

export interface TopDownLettersProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const TopDownLettersSfcTyped = TopDownLettersSfc as unknown as DefineComponent<any, any, any>;

export const TopDownLetters: VueNodeConstructor<TopDownLettersProps> = defineVueNode(
  TopDownLettersSfcTyped,
  "TopDownLetters",
);

export interface DepthParallaxWordsProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const DepthParallaxWordsSfcTyped = DepthParallaxWordsSfc as unknown as DefineComponent<
  any,
  any,
  any
>;

export const DepthParallaxWords: VueNodeConstructor<DepthParallaxWordsProps> = defineVueNode(
  DepthParallaxWordsSfcTyped,
  "DepthParallaxWords",
);

export interface SharedAxisXProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const SharedAxisXSfcTyped = SharedAxisXSfc as unknown as DefineComponent<any, any, any>;

export const SharedAxisX: VueNodeConstructor<SharedAxisXProps> = defineVueNode(
  SharedAxisXSfcTyped,
  "SharedAxisX",
);

export interface StaggerFromCenterProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const StaggerFromCenterSfcTyped = StaggerFromCenterSfc as unknown as DefineComponent<any, any, any>;

export const StaggerFromCenter: VueNodeConstructor<StaggerFromCenterProps> = defineVueNode(
  StaggerFromCenterSfcTyped,
  "StaggerFromCenter",
);

export interface StaggerFromEdgesProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const StaggerFromEdgesSfcTyped = StaggerFromEdgesSfc as unknown as DefineComponent<any, any, any>;

export const StaggerFromEdges: VueNodeConstructor<StaggerFromEdgesProps> = defineVueNode(
  StaggerFromEdgesSfcTyped,
  "StaggerFromEdges",
);

export interface KineticCenterBuildProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const KineticCenterBuildSfcTyped = KineticCenterBuildSfc as unknown as DefineComponent<
  any,
  any,
  any
>;

export const KineticCenterBuild: VueNodeConstructor<KineticCenterBuildProps> = defineVueNode(
  KineticCenterBuildSfcTyped,
  "KineticCenterBuild",
);

export interface ShortSlideDownProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const ShortSlideDownSfcTyped = ShortSlideDownSfc as unknown as DefineComponent<any, any, any>;

export const ShortSlideDown: VueNodeConstructor<ShortSlideDownProps> = defineVueNode(
  ShortSlideDownSfcTyped,
  "ShortSlideDown",
);

export interface ShortSlideRightProps {
  text?: string;
  split?: string;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  duration?: number;
  stagger?: number;
  ease?: string;
  rise?: number;
  x?: number;
  blur?: number;
  scaleFrom?: number;
  opacityFrom?: number;
}

const ShortSlideRightSfcTyped = ShortSlideRightSfc as unknown as DefineComponent<any, any, any>;

export const ShortSlideRight: VueNodeConstructor<ShortSlideRightProps> = defineVueNode(
  ShortSlideRightSfcTyped,
  "ShortSlideRight",
);
