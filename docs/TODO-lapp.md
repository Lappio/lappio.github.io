# Lapp 待补内容（Content to supply）

所有示例笔记、项目和友链均保留在源码中并标记 `sample: true`，不会进入页面或搜索。补齐真实内容后再移除此标记；不要恢复发布提示或示例徽章。（Samples remain in source only; remove the flag after supplying real content.）

| 待补内容（What） | 文件及定位（File / selector） |
| --- | --- |
| 真实联系邮箱及 mailto 链接（Real email and mailto URL） | `index.html`：`#contact` 的 `TODO(Lapp)`；`contact/index.html`：`.contact-panel` 的 `TODO(Lapp)` |
| 个人 GitHub 主页地址（Personal GitHub profile URL） | `index.html`：`.contact-socials`；`contact/index.html`：`.link-directory`；均有 `TODO(Lapp)`，不再显示 GitHub 首页示例 |
| 个人 Are.na 主页地址（Personal Are.na profile URL） | `index.html`：`.contact-socials`；`contact/index.html`：`.link-directory`；均有 `TODO(Lapp)`，不再显示 Are.na 首页示例 |
| 真实笔记：中英标题、分类、日期、正文和项目相对详情 URL（Real notes: bilingual title, category, date, body and project-relative detail URL） | `script.js`：`entries.notes`，4 条 `sample: true`；展示位置 `index.html`、`notes/index.html` 的 `#notes-list` |
| 真实项目：中英标题、说明、项目相对详情 URL（Real projects: bilingual title, description and project-relative detail URL） | `script.js`：`entries.projects`，2 条 `sample: true`；展示位置 `index.html`、`projects/index.html` 的 `#projects-list` |
| 真实友链：名字、中英说明、网站 URL，可选头像和星图位置（Real friends: name, bilingual description, website URL, optional avatar and network position） | `script.js`：`friendLinks`，6 条 `sample: true`；`links/index.html`：`#friend-network`。有真实友链后自动显示星图 |
| 「在学」的真实内容与链接（Current learning text and URL） | `index.html`：`.now [data-todo="learning"]`；`script.js`：`copy.zh/en.nowLearning` |
| 「在做」的真实内容与链接（Current making text and URL） | `index.html`：`.now [data-todo="making"]`；`script.js`：`copy.zh/en.nowMaking` |
| 「在听」的真实内容与链接（Current listening text and URL） | `index.html`：`.now [data-todo="listening"]`；`script.js`：`copy.zh/en.nowListening` |
| 确认并提供个人介绍的中英文案（Review and supply bilingual personal introduction） | `about/index.html`：`.about-story-copy` 的 `TODO(Lapp)`；`script.js`：`copy.zh/en.aboutStoryOne`、`aboutStoryTwo` |

补齐邮箱与个人主页后，将对应「整理中」空状态换成真实链接；示例提示文字与 SAMPLE LINK 徽章继续保持不渲染。（Replace the relevant empty states with real links; keep sample hints and badges unpublished.）
