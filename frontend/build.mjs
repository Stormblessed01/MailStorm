import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const isWatch = process.argv.includes("--watch");
const outdir = resolve("dist");
const apiBase = process.env.MAILSTORM_API_BASE || "http://localhost:8787/api";
const backendOrigin = process.env.MAILSTORM_BACKEND_ORIGIN || "http://localhost:8787";

mkdirSync(outdir, { recursive: true });

const shared = {
  bundle: true,
  target: ["chrome114"],
  format: "iife",
  platform: "browser",
  sourcemap: true,
  minify: false,
  define: {
    __MAILSTORM_API_BASE__: JSON.stringify(apiBase)
  }
};

const tasks = [
  build({
    ...shared,
    entryPoints: [resolve("src/content.ts")],
    outfile: resolve("dist/content.js")
  }),
  build({
    ...shared,
    entryPoints: [resolve("src/background.ts")],
    outfile: resolve("dist/background.js")
  })
];

if (isWatch) {
  console.log("watch mode is not implemented in this starter. Run npm run build after edits.");
}

await Promise.all(tasks);

const manifestTemplate = readFileSync(resolve("public/manifest.template.json"), "utf-8");
const manifest = manifestTemplate.replace(/__MAILSTORM_BACKEND_ORIGIN__/g, backendOrigin);
writeFileSync(resolve("dist/manifest.json"), manifest, "utf-8");
console.log("frontend build complete");
