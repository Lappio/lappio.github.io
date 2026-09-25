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
    slugEdited: false,
    originalSlug: "",
    previewTimer: null,
    recoveryTimer: null,
    previewRevision: 0
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
    state.originalSlug = state.fields.slug || "";
    $("#current-file").textContent = state.sourceName || "未命名文章";
    $("#metadata-notice").hidden = Object.keys(state.extraFields).length === 0;
    $("#slug-warning").textContent = "";
    $("#clear-recovery").hidden = true;
    clearFieldErrors();
    schedulePreview();
  }

  function currentDocument() {
    const fields = { ...state.fields };
    for (const name of ["title", "date", "summary", "language", "slug", "body"]) {
      fields[name] = (name === "body" ? $("#article-body") : $(`#${name}`)).value;
    }
    return { fields, extraFields: state.extraFields };
  }

  function clearFieldErrors() {
    document.querySelectorAll("[data-error-for]").forEach(element => { element.textContent = ""; });
    document.querySelectorAll("[aria-invalid]").forEach(element => element.removeAttribute("aria-invalid"));
  }

  function errorMessage(error) {
    if (error.code === "STALE_FILE") return "磁盘上的文章已变化，保存已停止。请重新打开文章，或先下载当前内容留存。";
    if (error.code === "DUPLICATE_SLUG") return "这个 URL 名称已被其他文章使用，请修改后重试。";
    if (error.code === "FILE_EXISTS") return "同名文章文件已经存在，请修改 URL 名称。";
    if (error.code === "TOO_LARGE") return "文件超过 1 MiB，请缩小后重试。";
    if (error.code === "INVALID_ARTICLE") return `文章内容无效：${error.message}`;
    return error.message || "操作失败，请重试。";
  }

  function showError(error) {
    clearFieldErrors();
    if (error.field) {
      const fieldError = document.querySelector(`[data-error-for="${error.field}"]`);
      if (fieldError) fieldError.textContent = errorMessage(error);
      const input = error.field === "body" ? $("#article-body") : $(`#${error.field}`);
      if (input) input.setAttribute("aria-invalid", "true");
    }
    status(errorMessage(error), true);
  }

  function recoveryKey(name = state.sourceName) {
    return `writer:recovery:${name || "new"}`;
  }

  function clearRecovery(key = recoveryKey()) {
    clearTimeout(state.recoveryTimer);
    try { localStorage.removeItem(key); } catch { /* Storage can be disabled. */ }
    $("#clear-recovery").hidden = true;
  }

  function saveRecovery() {
    const copy = state.raw === null
      ? { ...currentDocument(), raw: null, downloadName: state.downloadName }
      : { raw: $("#raw-source").value, downloadName: state.downloadName };
    try {
      localStorage.setItem(recoveryKey(), JSON.stringify(copy));
      $("#clear-recovery").hidden = false;
      status("有未保存的修改；浏览器已保存恢复副本。" + (state.fields?.draft === true ? " 当前为草稿。" : ""));
    } catch {
      status("有未保存的修改；浏览器自动保存不可用。请尽快保存或下载。", true);
    }
  }

  function scheduleRecovery() {
    clearTimeout(state.recoveryTimer);
    state.recoveryTimer = setTimeout(saveRecovery, 220);
  }

  function restoreRecovery(name = state.sourceName) {
    let saved;
    try { saved = localStorage.getItem(recoveryKey(name)); } catch { return false; }
    if (!saved) return false;
    let copy;
    try { copy = JSON.parse(saved); } catch { clearRecovery(recoveryKey(name)); return false; }
    if (!window.confirm("找到这篇文章的浏览器恢复副本。要恢复未保存的修改吗？取消则丢弃副本并使用仓库内容。")) {
      clearRecovery(recoveryKey(name));
      return false;
    }
    if (typeof copy.raw === "string") {
      state.raw = copy.raw;
      $("#raw-source").value = copy.raw;
      $("#raw-repair").hidden = false;
      $("#editor-structured").hidden = true;
    } else if (copy.fields && typeof copy.fields === "object") {
      setDocument(copy);
    } else {
      clearRecovery(recoveryKey(name));
      return false;
    }
    state.downloadName = copy.downloadName || state.downloadName;
    state.dirty = true;
    $("#clear-recovery").hidden = false;
    status("已恢复浏览器中的未保存修改。请检查并保存到仓库。");
    return true;
  }

  function slugSuggestion(title) {
    return title.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function updateSlugWarning() {
    $("#slug-warning").textContent = state.sourceName && state.originalSlug &&
      $("#slug").value !== state.originalSlug
      ? "保存后文章的公开 URL 将改变；推送后旧地址可能失效。" : "";
  }

  function previewPlaceholder() {
    const empty = document.createElement("div");
    empty.className = "preview-empty";
    const heading = document.createElement("h3");
    heading.textContent = "文章会在这里成形。";
    const detail = document.createElement("p");
    detail.textContent = "填写标题和正文，即可预览阅读效果。";
    empty.append(heading, detail);
    $("#preview").replaceChildren(empty);
  }

  async function renderPreview(revision) {
    if (state.raw !== null) { previewPlaceholder(); return; }
    const fields = currentDocument().fields;
    if (!fields.title && !fields.body) { previewPlaceholder(); return; }
    try {
      const result = await api("/api/preview", { method: "POST", body: { markdown: fields.body } });
      if (revision !== state.previewRevision) return;
      const fragment = document.createDocumentFragment();
      const title = document.createElement("h1");
      title.className = "preview-title";
      title.textContent = fields.title || "无标题";
      const summary = document.createElement("p");
      summary.className = "preview-summary";
      summary.textContent = fields.summary;
      const date = document.createElement("time");
      date.className = "preview-date";
      date.textContent = fields.date;
      const body = document.createElement("div");
      body.className = "preview-body";
      body.innerHTML = result.html;
      fragment.append(title, summary, date, body);
      $("#preview").replaceChildren(fragment);
    } catch {
      if (revision === state.previewRevision) $("#preview").textContent = "预览暂时失败。修改正文后会重试。";
    }
  }

  function schedulePreview() {
    clearTimeout(state.previewTimer);
    const revision = ++state.previewRevision;
    state.previewTimer = setTimeout(() => renderPreview(revision), 180);
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
      if (state.dirty) saveRecovery();
      clearTimeout(state.recoveryTimer);
      const opened = await api(`/api/articles/${encodeURIComponent(name)}`);
      let parsed;
      try {
        parsed = await api("/api/parse", { method: "POST", body: { markdown: opened.markdown, source: name } });
      } catch (error) {
        state.sourceName = name;
        state.fingerprint = opened.fingerprint;
        state.raw = opened.markdown;
        state.dirty = false;
        state.downloadName = name;
        $("#raw-source").value = opened.markdown;
        $("#raw-repair").hidden = false;
        $("#editor-structured").hidden = true;
        $("#current-file").textContent = name;
        $("#clear-recovery").hidden = true;
        status(`已打开 ${name}；请修正 YAML 后重新解析。`, true);
        restoreRecovery(name);
        renderList();
        setActivePanel("edit");
        return;
      }
      state.sourceName = name;
      state.fingerprint = opened.fingerprint;
      state.downloadName = name;
      setDocument(parsed.document);
      const originalSlug = state.originalSlug;
      if (!restoreRecovery(name)) status(`已打开 ${name}，尚无未保存的修改。`);
      state.originalSlug = originalSlug;
      updateSlugWarning();
      renderList();
      setActivePanel("edit");
    } catch (error) {
      status(`无法打开文章：${error.message}`, true);
    }
  }

  function newArticle() {
    if (state.dirty && !window.confirm("当前修改尚未保存。要新建文章吗？")) return;
    if (state.dirty) saveRecovery();
    clearTimeout(state.recoveryTimer);
    state.sourceName = null;
    state.fingerprint = null;
    state.downloadName = null;
    setDocument({ fields: emptyFields(), extraFields: {} });
    if (!restoreRecovery(null)) status("新文章尚未保存到仓库。");
    renderList();
    setActivePanel("edit");
    $("#title").focus();
  }

  async function parseRawSource() {
    try {
      const raw = $("#raw-source").value;
      const parsed = await api("/api/parse", { method: "POST", body: { markdown: raw, source: state.sourceName || "import.md" } });
      const originalSlug = state.originalSlug;
      setDocument(parsed.document);
      if (state.sourceName) state.originalSlug = originalSlug;
      updateSlugWarning();
      state.dirty = true;
      scheduleRecovery();
      status("源码已解析。保存前请检查字段。");
    } catch (error) {
      status(`仍无法解析：${errorMessage(error)}`, true);
    }
  }

  function onFieldChange(event) {
    if (state.raw !== null) return;
    const element = event.target;
    const name = element.id === "article-body" ? "body" : element.id;
    if (!(name in state.fields)) return;
    state.fields[name] = name === "draft" ? element.checked : element.value;
    if (name === "slug") state.slugEdited = true;
    if ((name === "title" || name === "language") && state.fields.language === "en" && !state.slugEdited) {
      const suggestion = slugSuggestion($("#title").value);
      if (suggestion) {
        $("#slug").value = suggestion;
        state.fields.slug = suggestion;
      }
    }
    if (name === "body") $("#word-count").textContent = `${element.value.length} 字`;
    if (name === "slug") updateSlugWarning();
    const fieldError = document.querySelector(`[data-error-for="${name}"]`);
    if (fieldError) fieldError.textContent = "";
    element.removeAttribute("aria-invalid");
    state.dirty = true;
    status("有未保存的修改。" + (state.fields.draft === true ? " 当前为草稿。" : ""));
    scheduleRecovery();
    schedulePreview();
  }

  async function saveCurrent() {
    if (state.raw !== null) { status("请先修正并重新解析 YAML，再保存文章。", true); return; }
    const previousKey = recoveryKey();
    const path = state.sourceName ? `/api/articles/${encodeURIComponent(state.sourceName)}` : "/api/articles";
    const method = state.sourceName ? "PUT" : "POST";
    try {
      clearFieldErrors();
      const saved = await api(path, { method, body: {
        fingerprint: state.fingerprint, document: currentDocument()
      } });
      state.sourceName = saved.name;
      state.downloadName = saved.name;
      state.fingerprint = saved.fingerprint;
      state.originalSlug = $("#slug").value;
      state.dirty = false;
      clearRecovery(previousKey);
      $("#current-file").textContent = saved.name;
      updateSlugWarning();
      try { await refreshArticles(); } catch {
        status(`已保存到 content/posts/${saved.name}，但文章列表暂时无法刷新。请检查、提交并推送 GitHub。`);
        return;
      }
      status(`已保存到 content/posts/${saved.name}。请检查、提交并推送 GitHub，网站才会更新。`);
    } catch (error) { showError(error); }
  }

  async function downloadCurrent() {
    if (state.raw !== null) { status("请先修正并重新解析 YAML，再下载文章。", true); return; }
    try {
      clearFieldErrors();
      const result = await api("/api/export", { method: "POST", body: {
        document: currentDocument(), sourceName: state.sourceName, downloadName: state.downloadName
      } });
      const url = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status(`已准备下载 ${result.filename}。下载不会更新仓库或网站。`);
    } catch (error) { showError(error); }
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("读取文件失败。"));
      reader.readAsText(file);
    });
  }

  async function importFile(file) {
    if (!file) return;
    if (!/\.md$/i.test(file.name)) { status("请选择 .md 格式的 Markdown 文件。", true); return; }
    if (file.size > 1024 * 1024) { status("文件超过 1 MiB，请缩小后重试。", true); return; }
    if (state.dirty && !window.confirm("当前修改尚未保存。要导入并替换编辑区内容吗？")) return;
    try {
      const markdown = await readFile(file);
      const parsed = await api("/api/parse", { method: "POST", body: { markdown, source: file.name } });
      if (state.dirty) saveRecovery();
      clearTimeout(state.recoveryTimer);
      state.sourceName = null;
      state.fingerprint = null;
      state.downloadName = file.name;
      setDocument(parsed.document);
      state.dirty = true;
      scheduleRecovery();
      status(`已导入 ${file.name}，尚未保存到仓库。`);
      renderList();
      setActivePanel("edit");
    } catch (error) { status(`导入失败：${errorMessage(error)}`, true); }
  }

  document.querySelectorAll(".writer-tabs [data-panel]").forEach(button => {
    button.addEventListener("click", () => setActivePanel(button.dataset.panel));
  });
  $("#article-search").addEventListener("input", renderList);
  $("#article-filter").addEventListener("change", renderList);
  $("#new-article").addEventListener("click", newArticle);
  $("#parse-source").addEventListener("click", parseRawSource);
  $("#raw-source").addEventListener("input", () => {
    state.raw = $("#raw-source").value;
    state.dirty = true;
    status("源码有未保存的修改，请重新解析。", true);
    scheduleRecovery();
  });
  $("#article-form").addEventListener("input", onFieldChange);
  $("#article-form").addEventListener("change", onFieldChange);
  $("#save-article").addEventListener("click", saveCurrent);
  $("#download-article").addEventListener("click", downloadCurrent);
  $("#import-file").addEventListener("change", event => {
    importFile(event.target.files?.[0]);
    event.target.value = "";
  });
  $("#clear-recovery").addEventListener("click", () => {
    if (!window.confirm("要清除这篇文章的浏览器恢复副本吗？当前编辑内容仍会留在页面中。")) return;
    clearRecovery();
    status("已清除浏览器恢复副本；当前编辑内容仍未保存到仓库。");
  });
  $("#import-button").addEventListener("click", () => $("#import-file").click());
  $("#article-form").addEventListener("submit", event => event.preventDefault());

  async function initialize() {
    try {
      state.token = (await api("/api/session")).token;
      setDocument({ fields: emptyFields(), extraFields: {} });
      restoreRecovery(null);
      await refreshArticles();
    } catch (error) {
      status(`无法读取本地文章：${error.message}`, true);
    }
  }
  initialize();
})();
