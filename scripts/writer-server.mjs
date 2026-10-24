import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import { decodeArticle } from "../lib/post-document.mjs";
import { createWriterStore, WriterError } from "../lib/writer-store.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const renderer = new MarkdownIt({ html: false, linkify: true });
const maxBodyBytes = 1024 * 1024;
const safeDownloadName = name => typeof name === "string" && /^[^/\\\x00-\x1f]+\.md$/.test(name);

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let length = 0;
  let tooLarge = false;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBodyBytes) {
      tooLarge = true;
    } else {
      chunks.push(chunk);
    }
  }
  if (tooLarge) throw new WriterError("TOO_LARGE", 413, "Article data exceeds 1 MiB");
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new WriterError("BAD_JSON", 400, "Expected JSON request body");
  }
}

function serveFile(response, pathname) {
  const paths = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/writer.css": ["writer.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"]
  };
  const match = paths[pathname];
  if (!match) return false;
  let data;
  try {
    data = readFileSync(join(root, "writer", match[0]));
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  response.writeHead(200, {
    "content-type": match[1],
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: blob:"
  });
  response.end(data);
  return true;
}

export async function startWriterServer({ postsDirectory, port = 4173 }) {
  const store = createWriterStore(postsDirectory);
  const token = randomBytes(32).toString("hex");
  let origin;
  const server = createServer(async (request, response) => {
    try {
      if (request.headers.host !== new URL(origin).host) {
        return sendJson(response, 403, { error: { code: "FORBIDDEN", message: "Use the local editor address" } });
      }
      const pathname = new URL(request.url, origin).pathname;
      const method = request.method;
      if (method === "GET" && pathname === "/api/session") return sendJson(response, 200, { token });
      if (method === "GET" && pathname === "/api/articles") {
        return sendJson(response, 200, { articles: store.listArticles() });
      }
      const articleRoute = /^\/api\/articles\/([^/]+)$/.exec(pathname);
      if (method === "GET" && articleRoute) {
        return sendJson(response, 200, store.openArticle(decodeURIComponent(articleRoute[1])));
      }
      const apiMutation = ["POST", "PUT"].includes(method) && pathname.startsWith("/api/");
      if (apiMutation && (request.headers["x-writer-token"] !== token ||
        (request.headers.origin && request.headers.origin !== origin))) {
        return sendJson(response, 403, { error: { code: "FORBIDDEN", message: "Local editor request required" } });
      }
      if (method === "POST" && pathname === "/api/parse") {
        const { markdown, source = "import.md" } = await readJson(request);
        if (typeof markdown !== "string") throw new WriterError("BAD_INPUT", 400, "Markdown text is required");
        try {
          return sendJson(response, 200, { document: decodeArticle(markdown, source) });
        } catch (error) {
          throw new WriterError("INVALID_ARTICLE", 422, error.message);
        }
      }
      if (method === "POST" && pathname === "/api/preview") {
        const { markdown } = await readJson(request);
        if (typeof markdown !== "string") throw new WriterError("BAD_INPUT", 400, "Markdown text is required");
        return sendJson(response, 200, { html: renderer.render(markdown) });
      }
      if (method === "POST" && pathname === "/api/export") {
        const { document, sourceName = null, downloadName } = await readJson(request);
        const { markdown, article } = store.prepareArticle({ name: sourceName, document });
        const filename = downloadName ?? `${article.slug}.md`;
        if (!safeDownloadName(filename)) throw new WriterError("BAD_NAME", 400, "Invalid download filename");
        return sendJson(response, 200, { markdown, filename });
      }
      if (method === "POST" && pathname === "/api/articles") {
        const { document } = await readJson(request);
        return sendJson(response, 201, store.saveArticle({ document }));
      }
      if (method === "PUT" && articleRoute) {
        const { fingerprint, document } = await readJson(request);
        return sendJson(response, 200, store.saveArticle({
          name: decodeURIComponent(articleRoute[1]), fingerprint, document
        }));
      }
      if (method === "GET" && serveFile(response, pathname)) return;
      return sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Route not found" } });
    } catch (error) {
      if (error instanceof WriterError) {
        const { code, message, field } = error;
        return sendJson(response, error.status, { error: { code, message, ...(field ? { field } : {}) } });
      }
      return sendJson(response, 500, { error: { code: "SERVER_ERROR", message: "Local editor failed" } });
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { url: origin, close: () => new Promise((resolveClose, reject) =>
    server.close(error => error ? reject(error) : resolveClose())) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const postsDirectory = join(root, "content", "posts");
  startWriterServer({ postsDirectory }).then(({ url }) => {
    process.stdout.write(`本地文章编辑器：${url}\n`);
  }).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
