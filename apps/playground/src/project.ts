import { makeProject } from "@motion-canvas/core";
import { molinianiExporterPlugin } from "@moliniani/core";

import example from "./scenes/example?scene";
import tresjs from "./scenes/tresjs?scene";
import scramble from "./scenes/scramble?scene";
import glow from "./scenes/glow?scene";

export default makeProject({
  plugins: [molinianiExporterPlugin],
  scenes: [example, tresjs, scramble, glow],
});
