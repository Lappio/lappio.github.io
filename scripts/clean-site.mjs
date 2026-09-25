import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

rmSync(fileURLToPath(new URL("../_site/", import.meta.url)), { recursive: true, force: true });
