import { makeProject } from "@motion-canvas/core";
import { molinianiExporterPlugin } from "@moliniani/core";

import example from "./scenes/example?scene";

export default makeProject({
  plugins: [molinianiExporterPlugin],
  scenes: [example],
});
