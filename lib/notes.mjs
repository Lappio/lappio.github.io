import { existsSync } from "node:fs";
import { readPosts } from "./posts.mjs";

// Notes use the same safe Markdown contract, in their own URL namespace.
export function readNotes(directory) {
  return existsSync(directory) ? readPosts(directory) : [];
}
