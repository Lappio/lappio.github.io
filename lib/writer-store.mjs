import { createHash, randomUUID } from "node:crypto";
import { existsSync, linkSync, lstatSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodeArticle, encodeArticle } from "./post-document.mjs";
import { parsePost } from "./posts.mjs";

export class WriterError extends Error {
  constructor(code, status, message, field) {
    super(message);
    this.name = "WriterError";
    this.code = code;
    this.status = status;
    if (field) this.field = field;
  }
}

const safeName = name => typeof name === "string" && /^[^/\\\x00-\x1f]+\.md$/.test(name);
const sha256 = content => createHash("sha256").update(content).digest("hex");

function articleNames(directory) {
  return readdirSync(directory).filter(name => name.endsWith(".md")).sort();
}

function assertArticleFile(directory, name) {
  if (!safeName(name)) throw new WriterError("BAD_NAME", 400, "Invalid article filename");
  const path = join(directory, name);
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") throw new WriterError("NOT_FOUND", 404, `Article ${name} was not found`);
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new WriterError("UNSAFE_TARGET", 400, `Article ${name} is not a regular file`);
  }
  return path;
}

function validationError(error) {
  const field = ["title", "date", "summary", "language", "slug", "draft", "body"]
    .find(candidate => new RegExp(`\\b${candidate}\\b`).test(error.message));
  return new WriterError("INVALID_ARTICLE", 422, error.message, field);
}

export function createWriterStore(postsDirectory) {
  const directory = resolve(postsDirectory);

  function listArticles() {
    return articleNames(directory).map(name => {
      try {
        const path = assertArticleFile(directory, name);
        const markdown = readFileSync(path, "utf8");
        const { fields } = decodeArticle(markdown, name);
        let error;
        try {
          parsePost(name, markdown);
        } catch (cause) {
          error = cause.message;
        }
        return {
          name, title: fields.title || name, date: fields.date || "",
          language: fields.language || "", slug: fields.slug || "",
          draft: fields.draft === true, ...(error ? { error } : {})
        };
      } catch (error) {
        return { name, title: name, date: "", language: "", slug: "", draft: false, error: error.message };
      }
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name));
  }

  function openArticle(name) {
    const path = assertArticleFile(directory, name);
    const markdown = readFileSync(path, "utf8");
    return { name, markdown, fingerprint: sha256(markdown) };
  }

  function prepareArticle({ name = null, document }) {
    if (name !== null && !safeName(name)) throw new WriterError("BAD_NAME", 400, "Invalid article filename");
    let markdown;
    let article;
    try {
      markdown = encodeArticle(document);
      article = parsePost(name || "new article", markdown);
    } catch (error) {
      throw validationError(error);
    }
    for (const other of articleNames(directory)) {
      if (other === name) continue;
      let decoded;
      try {
        decoded = decodeArticle(readFileSync(assertArticleFile(directory, other), "utf8"), other);
      } catch {
        continue;
      }
      if (decoded.fields.slug === article.slug) {
        throw new WriterError("DUPLICATE_SLUG", 409, `Slug ${article.slug} is already used by ${other}`, "slug");
      }
    }
    return { markdown, article };
  }

  function saveArticle({ name = null, fingerprint = null, document }) {
    if (name !== null && !safeName(name)) throw new WriterError("BAD_NAME", 400, "Invalid article filename");
    if (name !== null) assertArticleFile(directory, name);
    const { markdown, article } = prepareArticle({ name, document });
    const targetName = name ?? `${article.slug}.md`;
    const target = join(directory, targetName);
    if (name === null && existsSync(target)) {
      throw new WriterError("FILE_EXISTS", 409, `Article file ${targetName} already exists`);
    }
    if (name !== null && (typeof fingerprint !== "string" || sha256(readFileSync(target, "utf8")) !== fingerprint)) {
      throw new WriterError("STALE_FILE", 409, `Article ${targetName} changed on disk`);
    }

    const temporary = join(directory, `.writer-${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, markdown, { flag: "wx", mode: 0o600 });
      if (name === null) {
        try {
          linkSync(temporary, target);
        } catch (error) {
          if (error.code === "EEXIST") throw new WriterError("FILE_EXISTS", 409, `Article file ${targetName} already exists`);
          throw error;
        }
      } else {
        assertArticleFile(directory, name);
        if (sha256(readFileSync(target, "utf8")) !== fingerprint) {
          throw new WriterError("STALE_FILE", 409, `Article ${targetName} changed on disk`);
        }
        renameSync(temporary, target);
      }
    } finally {
      rmSync(temporary, { force: true });
    }
    return { name: targetName, fingerprint: sha256(markdown) };
  }

  return { listArticles, openArticle, prepareArticle, saveArticle };
}
