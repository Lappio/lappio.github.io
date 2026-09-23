import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredString(value, field, source) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source}: ${field} must be a nonempty string`);
  }
  return value.trim();
}

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function readPosts(directory) {
  const posts = [];
  const slugs = new Map();
  for (const name of readdirSync(directory).filter(name => name.endsWith(".md")).sort()) {
    const source = join(directory, name);
    let parsed;
    try {
      parsed = matter(readFileSync(source, "utf8"));
    } catch (error) {
      throw new Error(`${source}: invalid front matter: ${error.message}`, { cause: error });
    }
    const { data, content } = parsed;
    const title = requiredString(data.title, "title", source);
    const date = requiredString(data.date, "date", source);
    if (!validDate(date)) throw new Error(`${source}: date ${date} must be a real YYYY-MM-DD date`);
    const summary = requiredString(data.summary, "summary", source);
    const language = requiredString(data.language, "language", source);
    if (language !== "en" && language !== "zh") throw new Error(`${source}: language must be en or zh`);
    const slug = requiredString(data.slug, "slug", source);
    if (!slugPattern.test(slug)) throw new Error(`${source}: slug must use lowercase letters, numbers, and hyphens`);
    if (data.draft !== undefined && typeof data.draft !== "boolean") {
      throw new Error(`${source}: draft must be true or false`);
    }
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error(`${source}: body must not be empty`);
    }
    if (slugs.has(slug)) {
      throw new Error(`${source}: duplicate slug ${slug} already used by ${slugs.get(slug)}`);
    }
    slugs.set(slug, source);
    posts.push({ source, title, date, summary, language, slug, draft: data.draft === true, body: content });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
