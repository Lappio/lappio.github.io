import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = readFileSync(join(root, "script.js"), "utf8");
const posts = [
  { title: "中文文章", date: "2026-09-24", summary: "摘要", language: "zh", slug: "first-post", url: "blog/first-post/" },
  { title: "Second post", date: "2026-09-23", summary: "Second summary", language: "en", slug: "second-post", url: "blog/second-post/" },
  { title: "Third post", date: "2026-09-22", summary: "Third summary", language: "en", slug: "third-post", url: "blog/third-post/" },
  { title: "Fourth post", date: "2026-09-21", summary: "Fourth summary", language: "en", slug: "fourth-post", url: "blog/fourth-post/" }
];

async function loadPage(path, response = posts, preference, setup = "", before = "") {
  const html = readFileSync(join(root, path), "utf8");
  const url = `https://example.test/repository-name/${path === "index.html" ? "" : path.replace(/index\.html$/, "")}`;
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.ResizeObserver = class { observe() {} disconnect() {} };
  if (preference) dom.window.localStorage.setItem("lappio-language", preference);
  dom.window.fetch = async () => {
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  };
  dom.window.eval(before);
  dom.window.eval(script.replace("const entries = { blog: [], notes: [], projects: [] };", "const entries = window.fixtureEntries || { blog: [], notes: [], projects: [] };") + "\n" + setup);
  await new Promise(resolve => setTimeout(resolve, 0));
  return dom;
}

test("home lists the newest three published posts with article links", async () => {
  const dom = await loadPage("index.html");
  try {
    const links = [...dom.window.document.querySelectorAll("#blog-list a")];
    assert.equal(links.length, 3);
    assert.equal(links[0].textContent.includes("中文文章"), true);
    assert.equal(links[0].getAttribute("href"), "./blog/first-post/");
    assert.equal(new URL(links[0].href).pathname, "/repository-name/blog/first-post/");
  } finally {
    dom.window.close();
  }
});

test("Blog lists all articles and search opens a detail URL", async () => {
  const dom = await loadPage("blog/index.html");
  try {
    const document = dom.window.document;
    assert.equal(document.querySelectorAll("#blog-list a").length, 4);
    const input = document.querySelector("#search-input");
    input.value = "中文文章";
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    const result = document.querySelector("#search-results a");
    assert.equal(result.getAttribute("href"), "../blog/first-post/");
    assert.equal(new URL(result.href).pathname, "/repository-name/blog/first-post/");
    document.querySelector("#language-toggle").click();
    assert.equal(document.querySelector("#blog-list a h3").textContent, "中文文章");
  } finally {
    dom.window.close();
  }
});

test("empty blog shows a translated empty state", async () => {
  const dom = await loadPage("blog/index.html", []);
  try {
    const document = dom.window.document;
    assert.match(document.querySelector("#blog-list").textContent, /还没有发布文章，很快就来。/);
    document.querySelector("#language-toggle").click();
    assert.match(document.querySelector("#blog-list").textContent, /No articles yet/i);
  } finally {
    dom.window.close();
  }
});

test("unavailable or malformed index leaves other sections usable", async () => {
  for (const response of [new Error("offline"), { invalid: true }]) {
    const dom = await loadPage("index.html", response);
    try {
      const document = dom.window.document;
      assert.match(document.querySelector("#blog-list").textContent, /文章暂时无法加载/);
      assert.ok(document.querySelector("#notes-list").textContent.length > 0);
      assert.ok(document.querySelector("#projects-list").textContent.length > 0);
      document.querySelector("#language-toggle").click();
      assert.match(document.querySelector("#blog-list").textContent, /Articles are unavailable/i);
    } finally {
      dom.window.close();
    }
  }
});

test("article page retains its source language and uses project-relative links", async () => {
  const template = readFileSync(join(root, "_includes/post.njk"), "utf8")
    .replaceAll("{{ title }}", "An English article")
    .replaceAll("{{ language }}", "en")
    .replaceAll("{{ date }}", "2026-10-27")
    .replace("{{ content | safe }}", "<p>The article body stays in English.</p>");
  const dom = new JSDOM(template, {
    url: "https://example.test/repository-name/blog/first-post/",
    runScripts: "outside-only"
  });
  try {
    dom.window.fetch = async () => ({ ok: true, json: async () => posts });
    dom.window.eval(script);
    await new Promise(resolve => setTimeout(resolve, 0));
    const document = dom.window.document;
    assert.equal(document.querySelector(".post-header time").textContent, "2026年10月27日");
    assert.equal(document.querySelector(".post-header time").dateTime, "2026-10-27");
    assert.equal(document.querySelector('.desktop-nav a[data-i18n="navBlog"]').getAttribute("aria-current"), "page");
    assert.equal(new URL(document.querySelector(".brand").href).pathname, "/repository-name/");
    document.querySelector("#language-toggle").click();
    assert.equal(document.querySelector(".post-header time").textContent, "Oct 27, 2026");
    assert.equal(document.querySelector("article").lang, "en");
    assert.match(document.querySelector("article").textContent, /The article body stays in English/);
    assert.match(document.title, /An English article/);
  } finally {
    dom.window.close();
  }
});


test("Chinese is the static and runtime default; saved English and both toggle directions work", async () => {
  for (const page of ["index.html", ...["blog", "notes", "projects", "links", "about", "contact"].map(name => `${name}/index.html`)]) {
    assert.match(readFileSync(join(root, page), "utf8"), /<html lang="zh-CN">/);
    for (const preference of [undefined, "en", "zh"]) {
      const dom = await loadPage(page, posts, preference);
      try {
        const { document, localStorage } = dom.window;
        const initial = preference === "en" ? "en" : "zh-CN";
        assert.equal(document.documentElement.lang, initial);
        const toggle = document.querySelector("#language-toggle");
        toggle.click();
        assert.equal(document.documentElement.lang, initial === "en" ? "zh-CN" : "en");
        assert.equal(localStorage.getItem("lappio-language"), initial === "en" ? "zh" : "en");
        toggle.click();
        assert.equal(document.documentElement.lang, initial);
      } finally { dom.window.close(); }
    }
  }
});


test("sample entries, profiles and publishing hints never appear in live DOM or search", async () => {
  for (const path of ["index.html", "notes/index.html", "projects/index.html", "links/index.html", "contact/index.html", "about/index.html"]) {
    const dom = await loadPage(path);
    try {
      const d = dom.window.document;
      assert.equal(d.querySelectorAll('a[href="mailto:hello@example.com"], a[href="https://github.com/"], a[href="https://www.are.na/"]').length, 0);
      assert.equal(d.querySelectorAll(".note-card, .project, .friend-node").length, 0);
      assert.equal(d.querySelectorAll('[data-i18n="sampleEntries"], [data-i18n="friendSampleHint"], [data-i18n="aboutSampleHint"]').length, 0);
      for (const query of ["凌乱初稿", "开放笔记本", "messy first draft", "Small tools"]) {
        const input = d.querySelector("#search-input");
        input.value = query;
        input.dispatchEvent(new dom.window.Event("input"));
        assert.equal(d.querySelectorAll("#search-results a").length, 0);
      }
      for (const [selector, zh, en] of [["#notes-list", "笔记整理中", "Notes are taking shape"], ["#projects-list", "项目整理中", "Projects are taking shape"], ["#friends-empty", "友链整理中", "Friend links are taking shape"]]) {
        const node = d.querySelector(selector);
        if (!node) continue;
        assert.ok(node.textContent.includes(zh));
        d.querySelector("#language-toggle").click();
        assert.ok(node.textContent.includes(en));
        d.querySelector("#language-toggle").click();
      }
    } finally { dom.window.close(); }
  }
});

test("published cards have exactly one project-relative link and capped stagger", async () => {
  const dom = await loadPage("index.html", posts, undefined, `entries.notes = [{title:{zh:"真实笔记",en:"Real note"},date:"2026-10-27",url:"notes/real/"}]; entries.projects = [{title:{zh:"真实项目",en:"Real project"},description:{zh:"说明",en:"Description"},url:"projects/real/"}]; renderContent();`);
  try {
    const d = dom.window.document;
    for (const card of d.querySelectorAll(".entry, .note-card, .project")) {
      assert.equal(card.querySelectorAll("a").length, 1);
      assert.equal(card.querySelectorAll("a a, a button, a input, button").length, 0);
      assert.ok(card.querySelector("a").getAttribute("href").startsWith("./"));
    }
    assert.equal(d.querySelector(".note-card a").getAttribute("href"), "./notes/real/");
    assert.equal(d.querySelector(".project a").getAttribute("href"), "./projects/real/");
  } finally { dom.window.close(); }
  const many = Array.from({length:12}, (_, i) => ({...posts[0],slug:`post-${i}`,url:`blog/post-${i}/` }));
  const blog = await loadPage("blog/index.html", many);
  try {
    assert.equal(blog.window.document.querySelector(".entry:last-child").style.getPropertyValue("--i"), "5");
  } finally { blog.window.close(); }
});

test("hand copy and avatar switch language while unfinished content stays hidden", async () => {
  for (const path of ['index.html', 'about/index.html']) {
    const dom = await loadPage(path);
    try {
      const d = dom.window.document;
      const hidden = d.querySelector(path === 'index.html' ? '.now' : '.about-story-copy');
      for (const lang of ['zh', 'en', 'zh']) {
        if (d.documentElement.lang !== (lang === 'zh' ? 'zh-CN' : 'en')) d.querySelector('#language-toggle').click();
        for (const [selector, attr, zh, en] of [
          [".brand", "aria-label", "Lappio Blog 首页", "Lappio Blog home"],
          ["#search-open", "aria-label", "搜索", "Search"],
          ["#search-open", "title", "搜索", "Search"],
          [".desktop-nav", "aria-label", "主导航", "Main navigation"],
          [".mobile-nav", "aria-label", "移动端导航", "Mobile navigation"],
          ["#search-close", "aria-label", "关闭搜索", "Close search"]
        ]) assert.equal(d.querySelector(selector).getAttribute(attr), lang === "zh" ? zh : en);
        assert.equal(hidden.hidden, true);
        assert.equal(dom.window.getComputedStyle(hidden).display, 'none');
        assert.equal(d.querySelector('#language-toggle').getAttribute('aria-label'), lang === 'zh' ? '切换到英文' : 'Switch to Chinese');
        assert.equal(d.querySelector('.site-footer .hand').textContent, lang === 'zh' ? '感谢来访 ♡' : 'thanks for stopping by ♡');
        assert.ok(d.querySelector('.site-footer .hand .heart'));
        if (path === 'index.html') {
          assert.equal(d.querySelector('.hero-avatar').alt, lang === 'zh' ? 'Lappio 的头像' : 'Lappio’s avatar');
          assert.equal(d.querySelector('[data-i18n="heroHand"]').textContent, lang === 'zh' ? '嗨！' : 'hi there!');
        }
      }
    } finally { dom.window.close(); }
  }
});


test("storage failures preserve the Chinese default and in-memory toggles", async () => {
  for (const methods of [["getItem"], ["setItem"], ["getItem", "setItem"]]) {
    const before = methods.map(method => `Storage.prototype.${method} = () => { throw new DOMException("Storage disabled", "SecurityError"); };`).join("\n");
    const dom = await loadPage("index.html", posts, undefined, "", before);
    try {
      const d = dom.window.document;
      assert.equal(d.documentElement.lang, "zh-CN");
      assert.equal(d.querySelectorAll("#blog-list a").length, 3);
      d.querySelector("#language-toggle").click();
      assert.equal(d.documentElement.lang, "en");
      assert.match(d.querySelector("#notes-list").textContent, /Notes are taking shape/);
      d.querySelector("#language-toggle").click();
      assert.equal(d.documentElement.lang, "zh-CN");
    } finally { dom.window.close(); }
  }
});

test("cards and search exclude missing URLs and use published detail URLs", async () => {
  const dom = await loadPage("index.html", posts, undefined, `
    const fixtures = [
      {title:"URL fixture missing",description:"Description"},
      {title:"URL fixture empty",description:"Description",url:""},
      {title:"URL fixture null",description:"Description",url:null},
      {title:"URL fixture valid",description:"Description",url:"details/real/"},
      {title:"URL fixture sample",description:"Description",url:"details/sample/",sample:true}
    ];
    entries.notes = fixtures; entries.projects = fixtures;
    entries.blog.push({title:"URL fixture missing blog",summary:"Description",url:""});
    renderContent();
  `);
  try {
    const d = dom.window.document;
    for (const selector of ["#notes-list", "#projects-list"]) {
      assert.equal(d.querySelectorAll(`${selector} a`).length, 1);
      assert.equal(d.querySelector(`${selector} a`).getAttribute("href"), "./details/real/");
    }
    d.querySelector("#search-input").value = "URL fixture";
    d.querySelector("#search-input").dispatchEvent(new dom.window.Event("input"));
    assert.deepEqual([...d.querySelectorAll("#search-results a")].map(a => a.getAttribute("href")), ["./details/real/", "./details/real/"]);
  } finally { dom.window.close(); }
});

test("friend network loads the optimized avatar", async () => {
  const dom = await loadPage("links/index.html", posts, undefined, `
    visibleFriends.push({name:"Fixture",description:"Fixture",url:"https://example.test/",x:10,y:10});
    renderContent();
  `);
  try {
    assert.equal(dom.window.document.querySelector("#friend-avatar").getAttribute("src"), "../assets/lappio-avatar-240.webp");
  } finally { dom.window.close(); }
});

test("entrance animation is disabled for cards recreated after the first render", async () => {
  const dom = await loadPage("index.html", posts, undefined, "", `
    window.fetch = () => new Promise(() => {});
    window.fixtureEntries = {blog: [], notes: [{title:"Fixture",url:"notes/fixture/"}], projects: [{title:"Fixture",url:"projects/fixture/"}]};
  `);
  try {
    const d = dom.window.document;
    const css = readFileSync(join(root, "styles.css"), "utf8");
    const style = d.createElement("style");
    // jsdom does not evaluate media queries: exercise the motion rules directly.
    style.textContent = css.replace(/@media \(prefers-reduced-motion: no-preference\)\s*{([\s\S]*?)\n}/g, "$1");
    d.head.append(style);

    for (const card of d.querySelectorAll(".note-card")) assert.match(dom.window.getComputedStyle(card).animation, /card-arrive/);
    d.querySelector("#language-toggle").click();
    for (const card of d.querySelectorAll(".note-card, .project")) assert.equal(dom.window.getComputedStyle(card).animation, "none");
  } finally { dom.window.close(); }
});


test("blog cards enter after a delayed fetch and skip entrance on language toggle", async () => {
  const dom = await loadPage("index.html", posts, undefined, "", `
    window.fetch = () => new Promise(resolve => { window.resolveArticles = resolve; });
  `);
  try {
    const d = dom.window.document;
    const list = d.querySelector("#blog-list");
    assert.ok(list.querySelector(".entry-state"));
    assert.equal(list.querySelectorAll(".entry").length, 0);
    dom.window.resolveArticles({ok: true, json: async () => [posts[0]]});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(list.querySelectorAll(".entry").length, 1);
    assert.equal(list.hasAttribute("data-no-enter"), false);
    d.querySelector("#language-toggle").click();
    assert.equal(list.querySelectorAll(".entry").length, 1);
    assert.equal(list.hasAttribute("data-no-enter"), true);
  } finally { dom.window.close(); }
});

test("empty notes and projects preserve entrance for their first real cards", async () => {
  const dom = await loadPage("index.html", [], undefined, `
    window.showCards = () => {
      entries.notes = [{title:"Note",url:"notes/fixture/"}];
      entries.projects = [{title:"Project",url:"projects/fixture/"}];
      renderContent();
    };
  `);
  try {
    const d = dom.window.document;
    dom.window.showCards();
    for (const selector of ["#notes-list", "#projects-list"]) {
      assert.equal(d.querySelector(selector).children.length, 1);
      assert.equal(d.querySelector(selector).hasAttribute("data-no-enter"), false);
    }
    d.querySelector("#language-toggle").click();
    for (const selector of ["#notes-list", "#projects-list"]) {
      assert.equal(d.querySelector(selector).hasAttribute("data-no-enter"), true);
    }
  } finally { dom.window.close(); }
});
