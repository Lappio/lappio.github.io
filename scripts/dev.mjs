import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import "./clean-site.mjs";

const eleventy = fileURLToPath(new URL("../node_modules/@11ty/eleventy/cmd.cjs", import.meta.url));
const child = spawn(process.execPath, [eleventy, "--serve", ...process.argv.slice(2)], {
  stdio: "inherit", env: { ...process.env, LAPPIO_DEV: "1" },
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill();
  process.exitCode = code;
}
child.on("exit", code => stop(code ?? 1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
