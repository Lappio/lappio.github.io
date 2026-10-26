const notes = [
  { tag: { en: "PROCESS", zh: "方法" }, date: "09.21.26", title: { en: "The value of a messy first draft", zh: "凌乱初稿的价值" } },
  { tag: { en: "READING", zh: "阅读" }, date: "09.10.26", title: { en: "A book worth revisiting slowly", zh: "值得慢慢重读的一本书" } },
  { tag: { en: "IDEA", zh: "想法" }, date: "08.25.26", title: { en: "A better way to collect good questions", zh: "更好地收集好问题" } },
  { tag: { en: "OBSERVATION", zh: "观察" }, date: "08.03.26", title: { en: "Small details make a place memorable", zh: "微小的细节让地方难忘" } }
];

const projects = [
  {
    title: { en: "An open notebook", zh: "开放笔记本" },
    description: { en: "A growing collection of useful ideas, experiments, and resources.", zh: "持续收集有用的想法、实验与资源。" }
  },
  {
    title: { en: "Small tools, big curiosity", zh: "小工具，大好奇心" },
    description: { en: "Little digital experiments that make everyday work feel lighter.", zh: "一些让日常工作更轻松的数字小实验。" }
  }
];

const copy = {
  en: {
    skipLink: "Skip to content",
    previewTag: "Preview",
    dateline: "Open notebook",
    navLabel: "Main navigation",
    navBlog: "Blog",
    navNotes: "Notes",
    navProjects: "Projects",
    navLinks: "Links",
    navAbout: "About",
    navContact: "Contact",
    heroLine1: "Ideas worth",
    heroLine2: "keeping.",
    heroTitle: "Ideas worth keeping.",
    heroIntro: "Hello, I’m Lappio. This is a place for the things I’m learning, making, and thinking about. Expect thoughtful writing, quick notes, and work in progress.",
    exploreWriting: "Explore my writing",
    moreAbout: "More about me",
    writing: "Writing",
    aboutKicker: "A note from me",
    aboutBody: "I like turning curiosity into small experiments and clear stories. This blog is my open notebook: part archive, part playground, always evolving.",
    aboutSampleHint: "This introduction is sample copy—make it yours when you are ready.",
    contactBody: "Have a thought, question, or interesting thing to share? I’d love to hear from you.",
    friendSampleHint: "The friend links are samples. Replace them with your friends’ names and sites when ready.",
    footerNote: "Made with curiosity, one page at a time.",
    emptyArticles: "No articles yet. Check back soon.",
    unavailableArticles: "Articles are unavailable right now. Please try again later.",
    loadingArticles: "Loading articles…",
    allWriting: "All writing",
    sampleFlag: "Sample",
    specimenKicker: "Specimen · not published",
    specimenTitle: "Layout specimen: text that stays on this machine",
    specimenBanner: "Specimen · excluded from the site build",
    todoEmail: "Email not set yet",
    todoGithub: "GitHub profile not set yet",
    todoArena: "Are.na profile not set yet",
    backLive: "Live site",
    backPreview: "Back to this preview",
    searchLabel: "Search",
    noResults: "No matches found. Try another word.",
    blogLabel: "Blog",
    noteLabel: "Note",
    projectLabel: "Project"
  },
  zh: {
    skipLink: "跳转到正文",
    previewTag: "预览",
    dateline: "公开笔记本",
    navLabel: "主导航",
    navBlog: "博客",
    navNotes: "笔记",
    navProjects: "项目",
    navLinks: "链接",
    navAbout: "关于",
    navContact: "联系",
    heroLine1: "值得留下的",
    heroLine2: "想法。",
    heroTitle: "值得留下的想法。",
    heroIntro: "你好，我是 Lappio。这里记录我学到的知识、正在做的事情，以及偶尔冒出的想法。你会读到文章、随笔和持续更新的项目。",
    exploreWriting: "阅读文章",
    moreAbout: "了解我",
    writing: "文章",
    aboutKicker: "关于我",
    aboutBody: "我喜欢把好奇心变成小实验，也喜欢把复杂的事情讲清楚。这里是我的公开笔记本：既是档案，也是游乐场。",
    aboutSampleHint: "这段介绍是示例文案，随时可以换成你自己的故事。",
    contactBody: "有想法、问题，或者想分享有趣的东西？欢迎来信。",
    friendSampleHint: "当前友链仍是示例。你可以随时换成朋友的名字和网址。",
    footerNote: "带着好奇心，一页一页写下去。",
    emptyArticles: "暂无文章，欢迎稍后再来。",
    unavailableArticles: "文章暂时无法加载，请稍后再试。",
    loadingArticles: "正在加载文章……",
    allWriting: "所有文章",
    sampleFlag: "示例",
    specimenKicker: "试样 · 不发布",
    specimenTitle: "版式预览：一段只在本地出现的文字",
    specimenBanner: "试样 · 不进入正式构建",
    todoEmail: "邮箱还没填",
    todoGithub: "GitHub 主页还没填",
    todoArena: "Are.na 主页还没填",
    backLive: "正在使用的站点",
    backPreview: "返回这一方案",
    searchLabel: "搜索",
    noResults: "没有找到结果，试试别的关键词。",
    blogLabel: "文章",
    noteLabel: "笔记",
    projectLabel: "项目"
  }
};

const variant = document.body.dataset.variant;
const root = document.body.dataset.root || "./";
let language = "zh";
let posts = [];
let postsStatus = "loading";

try {
  language = localStorage.getItem("lappio-preview-language") === "en" ? "en" : "zh";
} catch {
  language = "zh";
}

function t(key) {
  return copy[language][key];
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.forEach(child => node.append(child));
  return node;
}

function formatPostDate(date) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

function applyChrome() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(node => {
    const value = copy[language][node.dataset.i18n];
    if (value !== undefined) node.textContent = value;
  });
  const title = document.body.dataset[language === "zh" ? "titleZh" : "titleEn"];
  if (title) document.title = title;
  const toggle = document.querySelector("#lang-toggle");
  if (toggle) {
    toggle.textContent = language === "zh" ? "EN" : "中文";
    toggle.setAttribute("aria-label", language === "zh" ? "切换到英文" : "Switch to Chinese");
  }
  const nav = document.querySelector("[data-nav]");
  if (nav) nav.setAttribute("aria-label", t("navLabel"));
  const search = document.querySelector("#search-input");
  if (search) {
    const placeholder = search.dataset[language === "zh" ? "placeholderZh" : "placeholderEn"];
    if (placeholder) search.placeholder = placeholder;
    search.setAttribute("aria-label", t("searchLabel"));
  }
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

function statusKey() {
  if (postsStatus === "loading") return "loadingArticles";
  if (postsStatus === "error") return "unavailableArticles";
  return "emptyArticles";
}

function storyLink(post, lead) {
  const link = el("a", {
    className: lead ? "story" : "story-row",
    href: `${root}${post.url}`,
    lang: post.language
  });
  link.append(el("time", { datetime: post.date, text: formatPostDate(post.date) }));
  link.append(el(lead ? "h2" : "strong", { text: post.title }));
  if (lead) link.append(el("p", { text: post.summary }));
  return link;
}

function renderPostsA() {
  const feature = document.querySelector("#post-feature");
  const list = document.querySelector("#post-list");
  if (!feature && !list) return;
  if (feature) feature.replaceChildren();
  if (list) list.replaceChildren();
  if (postsStatus !== "ready" || posts.length === 0) {
    const message = el("p", {
      className: postsStatus === "ready" ? "story-empty" : "story-status",
      text: t(statusKey())
    });
    if (feature) feature.append(message);
    else if (list) list.append(message);
    return;
  }
  if (feature) feature.append(storyLink(posts[0], true));
  if (list) posts.slice(feature ? 1 : 0, 6).forEach(post => list.append(storyLink(post, false)));
}

function renderPostsB() {
  const list = document.querySelector("#post-list");
  if (!list) return;
  list.replaceChildren();
  if (postsStatus !== "ready" || posts.length === 0) {
    list.append(el("p", { className: "story-status", text: t(statusKey()) }));
    return;
  }
  posts.forEach(post => {
    const link = el("a", { className: "row", href: `${root}${post.url}`, lang: post.language });
    link.append(el("span", { className: "dim", text: post.date }));
    link.append(el("span", { className: "accent", text: post.language }));
    link.append(el("span", { text: post.title }));
    list.append(link);
  });
}

function renderPostsC() {
  const list = document.querySelector("#post-list");
  if (!list) return;
  list.replaceChildren();
  if (postsStatus !== "ready" || posts.length === 0) {
    list.append(el("div", { className: "slab story-empty" }, [
      el("p", { text: t(statusKey()) })
    ]));
    return;
  }
  posts.forEach(post => {
    const link = el("a", { className: "slab", href: `${root}${post.url}`, lang: post.language });
    link.append(el("time", { datetime: post.date, text: formatPostDate(post.date) }));
    link.append(el("h3", { text: post.title }));
    link.append(el("p", { text: post.summary }));
    list.append(link);
  });
}

function renderPosts() {
  if (variant === "a") renderPostsA();
  else if (variant === "b") renderPostsB();
  else renderPostsC();
  if (postsStatus !== "loading") document.body.dataset.postsReady = "true";
}

function renderNotes() {
  const list = document.querySelector("#note-list");
  if (!list) return;
  list.replaceChildren();
  notes.forEach(note => {
    if (variant === "b") {
      const row = el("article", { className: "row" });
      row.append(el("span", { className: "dim", text: note.date }));
      row.append(el("span", { className: "accent", text: note.tag[language] }));
      row.append(el("span", { text: note.title[language] }));
      row.append(el("span", { className: "dim", text: t("sampleFlag") }));
      list.append(row);
      return;
    }
    if (variant === "c") {
      const chip = el("article", { className: "chip" });
      chip.append(el("span", { className: "tag", text: note.tag[language] }));
      chip.append(el("span", { text: note.title[language] }));
      chip.append(el("span", { className: "meta", text: t("sampleFlag") }));
      list.append(chip);
      return;
    }
    const item = el("article", { className: "note" });
    item.append(el("span", { className: "tag", text: note.tag[language] }));
    item.append(el("h3", { text: note.title[language] }));
    item.append(el("p", { className: "meta", text: `${note.date} · ${t("sampleFlag")}` }));
    list.append(item);
  });
}

function renderProjects() {
  const list = document.querySelector("#project-list");
  if (!list) return;
  list.replaceChildren();
  projects.forEach((project, index) => {
    if (variant === "b") {
      const row = el("article", { className: "row project-row" });
      row.append(el("span", { className: "dim", text: `0${index + 1}` }));
      row.append(el("span", { className: "accent", text: t("sampleFlag") }));
      const text = el("span", { className: "stack" });
      text.append(el("strong", { text: project.title[language] }));
      text.append(el("span", { className: "dim", text: project.description[language] }));
      row.append(text);
      list.append(row);
      return;
    }
    if (variant === "c") {
      const panel = el("article", { className: "panel" });
      panel.append(el("span", { className: "meta", text: t("sampleFlag") }));
      panel.append(el("h3", { text: project.title[language] }));
      panel.append(el("p", { text: project.description[language] }));
      list.append(panel);
      return;
    }
    const item = el("article", { className: "project" });
    item.append(el("span", { className: "index", text: `0${index + 1}` }));
    item.append(el("h3", { text: project.title[language] }));
    item.append(el("p", { text: project.description[language] }));
    item.append(el("p", { className: "meta", text: t("sampleFlag") }));
    list.append(item);
  });
}

function sectionHref(id) {
  return document.getElementById(id) ? `#${id}` : `../#${id}`;
}

function catalog() {
  const specimen = document.body.dataset.specimen;
  const items = [
    ...posts.map(post => ({ kind: t("blogLabel"), title: post.title, href: `${root}${post.url}` })),
    ...notes.map(note => ({ kind: t("noteLabel"), title: note.title[language], href: sectionHref("notes") })),
    ...projects.map(project => ({ kind: t("projectLabel"), title: project.title[language], href: sectionHref("projects") }))
  ];
  if (specimen) items.push({ kind: t("specimenKicker"), title: t("specimenTitle"), href: specimen });
  return items;
}

function renderSearch() {
  const box = document.querySelector("#search-results");
  const input = document.querySelector("#search-input");
  if (!box || !input) return;
  const query = input.value.trim().toLocaleLowerCase();
  box.replaceChildren();
  if (!query) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const matches = catalog().filter(item => `${item.title} ${item.kind}`.toLocaleLowerCase().includes(query));
  if (!matches.length) {
    box.append(el("p", { className: "search-empty", text: t("noResults") }));
    return;
  }
  matches.forEach(item => {
    const link = el("a", { href: item.href });
    link.append(el("small", { text: item.kind }));
    link.append(el("strong", { text: item.title }));
    box.append(link);
  });
}

function render() {
  applyChrome();
  renderNotes();
  renderProjects();
  renderPosts();
  renderSearch();
}

const toggle = document.querySelector("#lang-toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    try {
      localStorage.setItem("lappio-preview-language", language);
    } catch {
      /* Language still switches for this page view. */
    }
    render();
  });
}

const searchForm = document.querySelector(".search");
const searchInput = document.querySelector("#search-input");
if (searchForm) searchForm.addEventListener("submit", event => event.preventDefault());
if (searchInput) searchInput.addEventListener("input", renderSearch);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && searchInput) {
    searchInput.value = "";
    renderSearch();
  }
});

render();

fetch(`${root}articles.json`)
  .then(response => {
    if (!response.ok) throw new Error("Article index unavailable");
    return response.json();
  })
  .then(payload => {
    if (!Array.isArray(payload)) throw new Error("Invalid article index");
    posts = payload;
    postsStatus = "ready";
    render();
  })
  .catch(() => {
    posts = [];
    postsStatus = "error";
    render();
  });
