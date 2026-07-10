import { build } from "esbuild";

await build({
  entryPoints: ["./src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "./dist/index.mjs",
  sourcemap: true,
  // Keep pino and its transports external to avoid worker-thread bundling issues
  external: [
    "pino",
    "pino-http",
    "pino-pretty",
    "thread-stream",
    "node-gyp-build",
    "bcrypt",
    "pg",
    "pg-native",
    "express-session",
  ],
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`.trim(),
  },
});

console.log("Build complete.");
