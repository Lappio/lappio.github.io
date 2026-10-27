import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "./clean-site.mjs";

for (const [entry, args] of [
  ["../node_modules/vite/bin/vite.js", ["build"]],
  ["../node_modules/@11ty/eleventy/cmd.cjs", process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(entry, import.meta.url)), ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
