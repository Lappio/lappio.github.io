(() => {
  const state = {
    sourceName: null,
    fingerprint: null,
    fields: null,
    extraFields: {},
    dirty: false,
    token: null,
    articles: [],
    raw: null,
    downloadName: null,
    slugEdited: false
  };
  const $ = selector => document.querySelector(selector);

  async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : {
        "content-type": "application/json",
        "x-writer-token": state.token
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error?.message || "请求失败，请重试。");
      error.code = result.error?.code;
      error.field = result.error?.field;
      throw error;
    }
    return result;
  }

  function status(message, error = false) {
    const element = $("#editor-status");
    element.textContent = message;
    element.classList.toggle("is-error", error);
  }

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function emptyFields() {
    return { title: "", date: today(), summary: "", language: "zh", slug: "", draft: false, body: "" };
  }

  function setActivePanel(panel) {
    document.body.dataset.activePanel = panel;
    document.querySelectorAll(".writer-tabs [data-panel]").forEach(button => {
      button.setAttribute("aria-selected", String(button.dataset.panel === panel));
    });
  }

  function setDocument(documentValue) {
    state.fields = { ...emptyFields(), ...documentValue.fields };
    state.extraFields = documentValue.extraFields || {};
    for (const name of ["title", "date", "summary", "language", "slug", "body"]) {
      const element = name === "body" ? $("#article-body") : $(`#${name}`);
      element.value = state.fields[name] ?? "";
    }
    $("#draft").checked = state.fields.draft === true;
    $("#word-count").textContent = `${$("#article-body").value.length} 字`;
    $("#raw-repair").hidden = true;
    $("#editor-structured").hidden = false;
    state.raw = null;
    state.dirty = false;
    state.slugEdited = Boolean(state.fields.slug);
    $("#current-file").textContent = state.sourceName || "未命名文章";
  }

  function listBadge(item) {
    const badge = document.createElement("span");
    badge.className = `card-badge ${item.error ? "is-error" : item.draft ? "is-draft" : ""}`;
    badge.textContent = item.error ? "需修复" : item.draft ? "草稿" : "可发布";
    return badge;
  }

  function renderList() {
    const list = $("#article-list");
    list.replaceChildren();
    $("#article-count").textContent = String(state.articles.length);
    const query = $("#article-search").value.trim().toLocaleLowerCase();
    const filter = $("#article-filter").value;
    const shown = state.articles.filter(item => {
      const matchesText = `${item.title} ${item.slug} ${item.name}`.toLocaleLowerCase().includes(query);
      const matchesFilter = filter === "all" || (filter === "draft" ? item.draft : !item.draft && !item.error);
      return matchesText && matchesFilter;
    });
    if (shown.length === 0) {
      const empty = document.createElement("p");
      empty.className = "list-empty";
      empty.textContent = state.articles.length === 0 ? "还没有文章。点击右上角 ＋ 开始写第一篇。" : "没有匹配的文章。";
      list.append(empty);
      return;
    }
    for (const item of shown) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "article-card";
      button.dataset.articleName = item.name;
      button.classList.toggle("is-active", item.name === state.sourceName);
      const date = document.createElement("span");
      date.className = "card-date";
      date.textContent = item.date || "日期待修复";
      const title = document.createElement("strong");
      title.textContent = item.title || item.name;
      const meta = document.createElement("span");
      meta.className = "card-meta";
      const slug = document.createElement("span");
      slug.textContent = item.slug ? `/${item.slug}/` : item.name;
      meta.append(slug, listBadge(item));
      button.append(date, title, meta);
      button.addEventListener("click", () => openArticle(item.name));
      list.append(button);
    }
  }

  async function refreshArticles() {
    const { articles } = await api("/api/articles");
    state.articles = Array.isArray(articles) ? articles : [];
    renderList();
  }

  async function openArticle(name) {
    if (state.dirty && !window.confirm("当前修改尚未保存。要切换文章吗？")) return;
    try {
      const opened = await api(`/api/articles/${encodeURIComponent(name)}`);
      let parsed;
      try {
        parsed = await api("/api/parse", { method: "POST", body: { markdown: opened.markdown, source: name } });
      } catch (error) {
        state.sourceName = name;
        state.fingerprint = opened.fingerprint;
        state.raw = opened.markdown;
        state.dirty = false;
        $("#raw-source").value = opened.markdown;
        $("#raw-repair").hidden = false;
        $("#editor-structured").hidden = true;
        $("#current-file").textContent = name;
        status(`已打开 ${name}；请修正 YAML 后重新解析。`, true);
        renderList();
        setActivePanel("edit");
        return;
      }
      state.sourceName = name;
      state.fingerprint = opened.fingerprint;
      state.downloadName = name;
      setDocument(parsed.document);
      status(`已打开 ${name}，尚无未保存的修改。`);
      renderList();
      setActivePanel("edit");
    } catch (error) {
      status(`无法打开文章：${error.message}`, true);
    }
  }

  function newArticle() {
    if (state.dirty && !window.confirm("当前修改尚未保存。要新建文章吗？")) return;
    state.sourceName = null;
    state.fingerprint = null;
    state.downloadName = null;
    setDocument({ fields: emptyFields(), extraFields: {} });
    status("新文章尚未保存到仓库。");
    renderList();
    setActivePanel("edit");
    $("#title").focus();
  }

  async function parseRawSource() {
    try {
      const raw = $("#raw-source").value;
      const parsed = await api("/api/parse", { method: "POST", body: { markdown: raw, source: state.sourceName || "import.md" } });
      setDocument(parsed.document);
      state.dirty = true;
      status("源码已解析。保存前请检查字段。");
    } catch (error) {
      status(`仍无法解析：${error.message}`, true);
    }
  }

  document.querySelectorAll(".writer-tabs [data-panel]").forEach(button => {
    button.addEventListener("click", () => setActivePanel(button.dataset.panel));
  });
  $("#article-search").addEventListener("input", renderList);
  $("#article-filter").addEventListener("change", renderList);
  $("#new-article").addEventListener("click", newArticle);
  $("#parse-source").addEventListener("click", parseRawSource);
  $("#import-button").addEventListener("click", () => $("#import-file").click());
  $("#article-form").addEventListener("submit", event => event.preventDefault());

  async function initialize() {
    try {
      state.token = (await api("/api/session")).token;
      setDocument({ fields: emptyFields(), extraFields: {} });
      await refreshArticles();
    } catch (error) {
      status(`无法读取本地文章：${error.message}`, true);
    }
  }
  initialize();
})();
