import { background, makeProject, molinianiExporterPlugin } from "@moliniani/core";
import {
  GroovySquaresBackground,
  KineticGridBackground,
  TopographicBackground,
} from "@moliniani/components/backgrounds";

import example from "./scenes/example?scene";
import tresjs from "./scenes/tresjs?scene";
import scramble from "./scenes/scramble?scene";
import glow from "./scenes/glow?scene";
import split from "./scenes/split?scene";
import reveal from "./scenes/reveal?scene";
import handRolled from "./scenes/hand-rolled?scene";
import softBlurIn from "./scenes/soft-blur-in?scene";
import perCharacterRise from "./scenes/per-character-rise?scene";
import perWordCrossfade from "./scenes/per-word-crossfade?scene";
import springScaleIn from "./scenes/spring-scale-in?scene";
import maskRevealUp from "./scenes/mask-reveal-up?scene";
import lineByLineSlide from "./scenes/line-by-line-slide?scene";
import microScaleFade from "./scenes/micro-scale-fade?scene";
import fadeThrough from "./scenes/fade-through?scene";
import sharedAxisY from "./scenes/shared-axis-y?scene";
import sharedAxisZ from "./scenes/shared-axis-z?scene";
import blurOutUp from "./scenes/blur-out-up?scene";
import scaleDownFade from "./scenes/scale-down-fade?scene";
import focusBlurResolve from "./scenes/focus-blur-resolve?scene";
import bottomUpLetters from "./scenes/bottom-up-letters?scene";
import topDownLetters from "./scenes/top-down-letters?scene";
import depthParallaxWords from "./scenes/depth-parallax-words?scene";
import sharedAxisX from "./scenes/shared-axis-x?scene";
import staggerFromCenter from "./scenes/stagger-from-center?scene";
import staggerFromEdges from "./scenes/stagger-from-edges?scene";
import typingText from "./scenes/typewriter?scene";
import shimmerSweep from "./scenes/shimmer-sweep?scene";
import kineticCenterBuild from "./scenes/kinetic-center-build?scene";
import shortSlideDown from "./scenes/short-slide-down?scene";
import shortSlideRight from "./scenes/short-slide-right?scene";

import shaderBackground from "./scenes/shader-background?scene";
import shaderBackgroundOverride from "./scenes/shader-background-override?scene";
import shaderBackgroundNone from "./scenes/shader-background-none?scene";
import shaderBackgroundFlowfield from "./scenes/shader-background-flowfield?scene";
import shaderBackgroundTopographic from "./scenes/shader-background-topographic?scene";
import shaderBackgroundSugarGlass from "./scenes/shader-background-sugar-glass?scene";
import shaderBackgroundKineticGrid from "./scenes/shader-background-kinetic-grid?scene";

export default makeProject(
  {
    plugins: [molinianiExporterPlugin],
    scenes: [
      example,
      tresjs,
      scramble,
      glow,
      split,
      reveal,
      handRolled,
      softBlurIn,
      perCharacterRise,
      perWordCrossfade,
      springScaleIn,
      maskRevealUp,
      lineByLineSlide,
      microScaleFade,
      fadeThrough,
      sharedAxisY,
      sharedAxisZ,
      blurOutUp,
      scaleDownFade,
      focusBlurResolve,
      bottomUpLetters,
      topDownLetters,
      depthParallaxWords,
      sharedAxisX,
      staggerFromCenter,
      staggerFromEdges,
      typingText,
      shimmerSweep,
      kineticCenterBuild,
      shortSlideDown,
      shortSlideRight,
      shaderBackground,
      shaderBackgroundOverride,
      shaderBackgroundNone,
      shaderBackgroundFlowfield,
      shaderBackgroundTopographic,
      shaderBackgroundSugarGlass,
      shaderBackgroundKineticGrid,
    ],
    experimentalFeatures: true,
  },
  {
    background: background(KineticGridBackground, {
      backdrop: "#02020a",
      density: 0.7,
    }),
  },
);
