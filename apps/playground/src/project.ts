import { makeProject } from "@motion-canvas/core";
import { molinianiExporterPlugin } from "@moliniani/core";

import example from "./scenes/example?scene";
import tresjs from "./scenes/tresjs?scene";

export default makeProject({
  plugins: [molinianiExporterPlugin],
  scenes: [example, tresjs],
});
