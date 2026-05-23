import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const htmlPath = join(dist, "index.html");

let html = await readFile(htmlPath, "utf8");

const scriptMatch = html.match(
  /<script type="module" crossorigin src="(.+?)"><\/script>/,
);
if (scriptMatch) {
  const js = await readFile(join(dist, scriptMatch[1]), "utf8");
  html = html.replace(
    scriptMatch[0],
    () => `<script type="module">\n${js}\n</script>`,
  );
}

const cssMatch = html.match(
  /<link rel="stylesheet" crossorigin href="(.+?)">/,
);
if (cssMatch) {
  const css = await readFile(join(dist, cssMatch[1]), "utf8");
  html = html.replace(cssMatch[0], () => `<style>\n${css}\n</style>`);
}

await writeFile(htmlPath, html);
