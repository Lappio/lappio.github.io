import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeArticle } from "./post-document.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredString(value, field, source) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source}: ${field} must be a nonempty string`);
  }
  if (value !== value.trim()) {
    throw new Error(`${source}: ${field} must not have surrounding whitespace`);
  }
  return value;
}

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function parsePost(source, markdown) {
  const { fields } = decodeArticle(markdown, source);
  const title = requiredString(fields.title, "title", source);
  const date = requiredString(fields.date, "date", source);
  if (!validDate(date)) throw new Error(`${source}: date ${date} must be a real YYYY-MM-DD date`);
  const summary = requiredString(fields.summary, "summary", source);
  const language = requiredString(fields.language, "language", source);
  if (language !== "en" && language !== "zh") throw new Error(`${source}: language must be en or zh`);
  const slug = requiredString(fields.slug, "slug", source);
  if (!slugPattern.test(slug)) throw new Error(`${source}: slug must use lowercase letters, numbers, and hyphens`);
  if (typeof fields.draft !== "boolean") {
    throw new Error(`${source}: draft must be true or false`);
  }
  if (typeof fields.body !== "string" || fields.body.trim() === "") {
    throw new Error(`${source}: body must not be empty`);
  }
  return { source, title, date, summary, language, slug, draft: fields.draft === true, body: fields.body };
}

export function readPosts(directory) {
  const posts = [];
  const slugs = new Map();
  for (const name of readdirSync(directory).filter(name => name.endsWith(".md")).sort()) {
    const source = join(directory, name);
    const post = parsePost(source, readFileSync(source, "utf8"));
    const { slug } = post;
    if (slugs.has(slug)) {
      throw new Error(`${source}: duplicate slug ${slug} already used by ${slugs.get(slug)}`);
    }
    slugs.set(slug, source);
    posts.push(post);
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
