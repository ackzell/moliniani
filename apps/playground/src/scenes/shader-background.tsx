import { makeScene } from "@moliniani/core";
import { addGroovyBackground } from "@moliniani/components/backgrounds";

export default makeScene(function* (view) {
  addGroovyBackground(view);
});
