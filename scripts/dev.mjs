import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "./clean-site.mjs";

const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const eleventy = fileURLToPath(new URL("../node_modules/@11ty/eleventy/cmd.cjs", import.meta.url));
const first = spawnSync(process.execPath, [vite, "build"], { stdio: "inherit" });
if (first.status !== 0) process.exit(first.status ?? 1);
const children = [
  spawn(process.execPath, [vite, "build", "--watch"], { stdio: "inherit", env: { ...process.env, LAPPIO_UI_WATCH: "1" } }),
  spawn(process.execPath, [eleventy, "--serve", ...process.argv.slice(2)], { stdio: "inherit" }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) child.on("exit", code => stop(code ?? 1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
