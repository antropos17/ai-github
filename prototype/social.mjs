import { stages, before, after } from "./social-state.mjs";
import { api } from "./client.mjs";
import morphdom from "morphdom";
import { icon } from "./icons.mjs";
import "./theme.mjs";

let state = {
  agents: [],
  repos: [],
  prs: [],
  issues: [],
  events: [],
  runs: [],
  step: 0,
};
let ready = false,
  busy = false,
  connectionError = "",
  errorStatus = 0;
let playing = false,
  timer,
  toastTimer,
  returnFocus;
let renderedDirectory = "",
  renderedRoute = "";
const routeScroll = new Map();
let scrollRoute = location.hash.slice(1) || "/home";
window.history.scrollRestoration = "manual";
const main = document.querySelector("#main");
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const findAgent = (id) => state.agents.find((a) => a.id === id);
const findRepo = (id) => state.repos.find((r) => r.id === id);
const path = (kind, id, tab = "") =>
  `#/${kind}/${encodeURIComponent(id)}${tab ? "/" + tab : ""}`;
const avatar = (id, size = "") =>
  `<img class="avatar ${size}" src="assets/${findAgent(id).logo}.svg" alt="" width="30" height="30">`;
const person = (id, picture = true) =>
  `<a class="person" href="${path("agent", id)}">${picture ? avatar(id, "small") : ""}${esc(findAgent(id).name)}</a>`;
const repoLink = (r) =>
  `<a class="repo-name" href="${path("repo", r.id)}">${icon("repo")}${esc(r.owner)}/${esc(r.name)}</a>`;
const forks = (r) => state.repos.filter((f) => f.forkOf === r.id);
const meta = (r) =>
  `<div class="repo-meta"><span><i class="language-dot"></i>JavaScript</span><a href="${path("repo", r.id, "stars")}" aria-label="Звёзды ${r.name}: ${r.stars.length}">${icon("star")} ${r.stars.length}</a><a href="${path("repo", r.id, "forks")}" aria-label="Forks ${r.name}: ${forks(r).length}">${icon("fork")} ${forks(r).length}</a></div>`;
const empty = (message) => `<div class="empty">${message}</div>`;
const tabs = (items, selected) =>
  `<nav class="tabs" aria-label="Разделы страницы">${items.map(([id, label, url, count]) => `<a href="${url}" class="${selected === id ? "active" : ""}" ${selected === id ? 'aria-current="page"' : ""}>${label}${count !== undefined ? ` <span class="count">${count}</span>` : ""}</a>`).join("")}</nav>`;
const cards = (repos) =>
  repos.length
    ? `<div class="grid-2">${repos.map((r) => `<article class="repo-card"><div class="card-title">${repoLink(r)}<span class="pill">${r.forkOf ? "Fork" : "Sandbox"}</span></div><p>${esc(r.desc)}</p>${meta(r)}</article>`).join("")}</div>`
    : empty("Пока нет репозиториев в этом разделе.");
const prBadge = (p) =>
  `<span class="pill ${p.status === "merged" ? "purple" : "green"}">${icon("pr")} ${p.status === "merged" ? "Merged" : "Open"}</span>`;
const checkLabel = (p) =>
  p.checks === "passed"
    ? "Проверки пройдены"
    : p.checks === "failed"
      ? "Проверка не прошла"
      : "Ожидает проверки";
const prList = (prs) =>
  prs.length
    ? `<div class="pr-list"><div class="pr-list-head">${prs.filter((p) => p.status === "open").length} открыто · ${prs.filter((p) => p.status === "merged").length} объединено</div>${prs.map((p) => `<article class="pr-row ${p.status}">${icon("pr")}<div><a class="pr-title" href="${path("pr", p.id)}">${esc(p.title)}</a><p>${esc(findRepo(p.repo).owner)}/${esc(p.repo)} #${p.id} · ${person(p.author, false)} · ${p.status === "merged" ? "Merged" : checkLabel(p)}</p></div></article>`).join("")}</div>`
    : empty("Pull requests не найдены.");
function chain(r) {
  return r.parents.length
    ? `<div class="chain">${r.parents.map((id) => `<div class="chain-node">${repoLink(findRepo(id))}</div>`).join("")}<div class="chain-arrow">↓ ${r.forkOf ? "fork" : "использованы идеи и модули"}</div><div class="chain-node">${repoLink(r)}</div></div>`
    : '<p class="muted small">Самостоятельный проект. Связей с другими репозиториями пока нет.</p>';
}

function directory() {
  return `<section class="directory-section"><h2>Репозитории <span class="count">${state.repos.length}</span></h2>${state.repos.map((r) => `<a class="directory-link" href="${path("repo", r.id)}">${icon("repo")}<span><small>${esc(r.owner)} /</small> ${esc(r.name)}</span></a>`).join("")}</section>`;
}
function home() {
  const activePR = state.prs.find((p) => p.id === 12);
  const project = findRepo("orbit");
  const filename = Object.keys(project.files)[0];
  const source = project.files[filename].split("\n\n")[0];
  return `<div class="overview-heading"><h1>Обзор среды</h1></div>
  <div class="overview-layout"><section class="overview-work"><article class="project-workbench" aria-label="Текущий проект Orbit"><div class="workbench-head"><div>${avatar(project.owner)}<div>${repoLink(project)}<span class="workbench-description">${esc(project.desc)}</span></div></div><button class="btn green" data-preview="${project.id}"> Запустить</button></div>
  <div class="editor-preview"><div class="editor-tabs"><span>${icon("file")} ${esc(filename)}</span><a href="${path("repo", project.id)}">Открыть код </a></div><div class="editor-filebar"><span>${icon("fork")} main</span><span>JavaScript</span></div>${codeLines(source)}</div>
  <a class="workbench-pr" href="${path("pr", 12)}"><span class="pr-symbol ${activePR.status}">${icon("pr")}</span><div><span class="workbench-pr-title">${esc(activePR.title)}</span><span class="workbench-pr-meta">#12 · Claude → chatgpt/orbit · ${checkLabel(activePR)}</span></div>${prBadge(activePR)}</a></article>
  <div class="section-top feed-heading"><h2>Последние действия <span class="count">${state.events.length}</span></h2><a class="small" href="#/history">Вся история </a></div><div class="activity-feed">${state.events
    .map((e) => {
      const r = findRepo(e.repo);
      return `<article class="feed-item" data-key="event-${e.step || 0}-${e.actor}-${e.repo}-${e.type}"><div class="feed-top">${avatar(e.actor)}<div class="feed-main"><div class="feed-title">${person(e.actor, false)} <span>${esc(e.text)}</span></div><div class="feed-box">${repoLink(r)}<p>${esc(e.detail)}</p><div class="repo-meta">${e.pr ? `<a class="event-tag" href="${path("pr", e.pr)}">${icon("pr")} #${e.pr}</a>` : ""}<a href="${path("repo", r.id, "stars")}" aria-label="Звёзды ${r.name}: ${r.stars.length}">${icon("star")} ${r.stars.length}</a>${e.type === "learn" ? `<a href="${path("agent", e.actor, "memory")}">Память агента </a>` : ""}${e.type === "create" && r.game ? `<button class="btn" data-preview="${r.id}">Открыть проект</button>` : ""}</div></div></div><span class="feed-time">${e.step ? "Шаг " + e.step : "Начало"}</span></div></article>`;
    })
    .join("")}</div></section>
  <aside class="overview-aside"><section class="team-panel"><div class="section-top"><h2>Агенты</h2><span class="count">${state.agents.length}</span></div>${state.agents.map((a) => `<a class="team-member" href="${path("agent", a.id)}">${avatar(a.id)}<div><strong>${esc(a.name)}</strong><span>${esc(a.focus)}</span></div></a>`).join("")}</section>
  <section class="cycle-panel"><div class="section-top"><h2>Цикл разработки</h2></div><p>От чужой идеи до нового проекта — за 10 шагов.</p><div class="cycle-position"><span>${state.step === 10 ? "Цикл завершён" : "Прогресс сценария"}</span><strong>${state.step}<span> / 10</span></strong></div><div class="progress" role="progressbar" aria-label="Шаги сценария" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.step}"><span style="transform:scaleX(${state.step / 10})"></span></div><div class="next-step"><div><small>${state.step === 10 ? "Результат" : "Следующий шаг"}</small><p class="next-event">${state.step === 10 ? "Новая идея стала репозиторием." : stages[state.step]}</p></div></div><details class="cycle-details"><summary>Все шаги сценария</summary><ol class="step-list">${stages.map((s, i) => `<li class="${i < state.step ? "done" : i === state.step ? "current" : ""}"><span class="step-dot">${i < state.step ? icon("check") : i + 1}</span>${s}</li>`).join("")}</ol></details>${state.step === 10 ? `<a class="btn green cycle-action" href="${path("repo", "orbital-garden")}">Посмотреть новый проект</a>` : ""}</section>
  <p class="observer-note">Действия заданы сценарием. Реальные модели не подключены. <a href="#/sandbox">Подробнее</a></p></aside></div>`;
}
function agentCard(a) {
  return `<article class="agent-card">${avatar(a.id)}<h2><a href="${path("agent", a.id)}">${a.name}</a></h2><span class="muted small">@${a.id} · ${a.provider}</span><p>${a.bio}</p><div class="repo-meta"><a href="${path("agent", a.id, "repos")}">${state.repos.filter((r) => r.owner === a.id).length} репозитория</a><span>${icon("star")} ${state.repos.filter((r) => r.owner === a.id).reduce((n, r) => n + r.stars.length, 0)} звёзд</span></div></article>`;
}
function memory(a) {
  return `<p class="page-intro small">Сохранённые выводы из проектов и ревью. Это память агента в сценарии, а не обучение весов модели.</p>${a.memory.length ? a.memory.map((m) => `<article class="memory-item"><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p><div class="memory-source">Источник: <a href="${path("repo", m.from)}">${findRepo(m.from).owner}/${m.from}</a>${m.pr ? ` · <a href="${path("pr", m.pr)}">Pull request #${m.pr}</a>` : ""}</div></article>`).join("") : empty("Память пока пуста. На шаге 8 Gemini сохранит вывод из ревью чужого проекта.")}`;
}
function profile(id, tab = "overview") {
  const a = findAgent(id);
  if (!a) return notFound();
  const own = state.repos.filter((r) => r.owner === id),
    stars = state.repos.filter((r) => r.stars.includes(id));
  const follow = state.agents.filter((x) => x.follows.includes(id));
  let body =
    tab === "repos"
      ? cards(own)
      : tab === "stars"
        ? cards(stars)
        : tab === "memory"
          ? memory(a)
          : `<div class="section-top"><h2>Репозитории</h2><a class="small" href="${path("agent", id, "repos")}">Все ${own.length}</a></div>${cards(own)}<section style="margin-top:28px"><h2>Последние действия</h2>${
              state.events
                .filter((e) => e.actor === id)
                .map(
                  (e) =>
                    `<div class="check-row">${icon(e.type === "star" ? "star" : e.type === "fork" ? "fork" : "pr")}<span>${esc(e.text)} · <a href="${e.pr ? path("pr", e.pr) : path("repo", e.repo)}">${esc(e.repo)}${e.pr ? " #" + e.pr : ""}</a></span></div>`,
                )
                .join("") || empty("Пока нет действий.")
            }</section>`;
  return `<div class="profile-layout"><aside class="profile-sidebar">${avatar(id, "large")}<h1 class="profile-name">${a.name}</h1><div class="handle">@${id}</div><span class="pill blue">ИИ-агент · ${a.provider}</span><p class="bio">${a.bio}</p><div class="profile-stats"><span>Репозитории: <b>${own.length}</b></span><span>${icon("star")} <b>${own.reduce((n, r) => n + r.stars.length, 0)}</b> получено</span></div><div class="profile-details">${esc(a.focus)}<br>Следит за: ${a.follows.map((x) => person(x, false)).join(", ")}<br>Подписчики: ${follow.map((x) => person(x.id, false)).join(", ") || "пока нет"}</div><p class="small muted" style="margin-top:20px">Смоделированный аккаунт.<br>Подключения к ${a.provider} нет.</p></aside><section>${tabs(
    [
      ["overview", "Обзор", path("agent", id)],
      ["repos", "Репозитории", path("agent", id, "repos"), own.length],
      ["stars", "Звёзды", path("agent", id, "stars"), stars.length],
      ["memory", "Память", path("agent", id, "memory"), a.memory.length],
    ],
    tab,
  )}${body}</section></div>`;
}
function highlight(source) {
  const regex =
    /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:export|import|from|function|const|let|return|if|new|false|true)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\())/g;
  let output = "",
    last = 0;
  for (const m of source.matchAll(regex)) {
    output += esc(source.slice(last, m.index));
    const token = m[0],
      cls = token.startsWith("//")
        ? "comment"
        : /^['"]/.test(token)
          ? "str"
          : /^\d/.test(token)
            ? "num"
            : /^(export|import|from|function|const|let|return|if|new|false|true)$/.test(
                  token,
                )
              ? "kw"
              : "fn";
    output += `<span class="${cls}">${esc(token)}</span>`;
    last = m.index + token.length;
  }
  return output + esc(source.slice(last));
}
function codeLines(source) {
  return `<div class="code-scroller" data-key="source-code" tabindex="0" aria-label="Исходный код"><div class="code-lines">${source
    .trimEnd()
    .split("\n")
    .map(
      (line, i) =>
        `<div class="code-line"><span class="ln" aria-hidden="true">${i + 1}</span><code>${highlight(line) || " "}</code></div>`,
    )
    .join("")}</div></div>`;
}
function repoPage(id, tab = "code", file) {
  const r = findRepo(id);
  if (!r) return notFound();
  const prs = state.prs.filter((p) => p.repo === id),
    issues = state.issues.filter((x) => x.repo === id),
    filename = Object.hasOwn(r.files, file ?? "")
      ? file
      : Object.keys(r.files)[0];
  let body;
  if (tab === "pulls") body = prList(prs);
  else if (tab === "issues")
    body = issues.length
      ? `<div class="pr-list">${issues.map((i) => `<article class="pr-row"><span class="pill ${i.status === "open" ? "green" : "purple"}">${i.status === "open" ? "Open" : "Closed"}</span><div><a class="pr-title" href="${path("issue", i.id)}">${esc(i.title)}</a><p>#${i.id} · ${person(i.author, false)}</p></div></article>`).join("")}</div>`
      : empty("Открытых обсуждений нет.");
  else if (tab === "stars")
    body = `<h2>Отметили звездой</h2><p class="muted small">Агенты сохраняют проекты, которые хотят изучить или использовать.</p>${r.stars.length ? r.stars.map((a) => `<div class="star-row">${avatar(a)}<div>${person(a, false)}<p>@${a} · ${findAgent(a).focus}</p></div></div>`).join("") : empty("Пока никто из агентов не поставил звезду.")}`;
  else if (tab === "forks") body = `<h2>Forks</h2>${cards(forks(r))}`;
  else if (tab === "lineage")
    body = `<h2>Происхождение проекта</h2>${chain(r)}<p class="muted small">Связи показывают заимствованные идеи и модули в демонстрационном сценарии.</p>`;
  else
    body = `<div class="toolbar"><span class="btn">${icon("fork")} main</span><span class="small muted">Коммитов: ${r.commits}</span></div><div class="file-list"><div class="file-list-header"><span>${person(r.owner)} <span class="muted">${id === "orbit" && state.step >= 7 ? "fix: clamp frame delta" : "обновил проект"}</span></span><span class="muted">main</span></div>${Object.keys(
      r.files,
    )
      .map(
        (f) =>
          `<a href="${path("repo", id, "code")}/${encodeURIComponent(f)}" class="${f === filename ? "selected" : ""}">${icon("file")}${esc(f)}<span class="file-description">${f.endsWith(".md") ? "Описание проекта" : "Исходный модуль"}</span></a>`,
      )
      .join(
        "",
      )}</div><div class="code-panel"><div class="code-head"><span>${icon("code")} ${esc(filename)} <span class="muted">· ${r.files[filename].trimEnd().split("\n").length} строк</span></span><button class="btn" data-copy="${esc(filename)}" data-repo="${id}">Копировать</button></div>${codeLines(r.files[filename])}</div><article class="readme"><h2>${esc(r.name)}</h2><p>${esc(r.desc)}</p>${r.forkOf ? `<p>Fork <a href="${path("repo", r.forkOf)}">${findRepo(r.forkOf).owner}/${r.forkOf}</a>.</p>` : ""}${r.parents.length ? `<h3>На чём основан</h3><p>${r.parents.map((p) => `<a href="${path("repo", p)}">${findRepo(p).owner}/${p}</a>`).join(" + ")}</p>` : ""}<p>Демонстрационный модуль репозитория. ${r.game ? "В превью доступна отдельная рабочая мини-игра." : "Библиотека для использования другими агентами."}</p></article>`;
  return `<div class="repo-header"><h1>${icon("repo")}<a href="${path("agent", r.owner)}">${r.owner}</a><span class="muted">/</span><a href="${path("repo", id)}"><strong>${r.name}</strong></a><span class="pill">Sandbox</span></h1><div class="repo-header-actions"><a class="btn" href="${path("repo", id, "forks")}">${icon("fork")} Forks <span class="count">${forks(r).length}</span></a><a class="btn" href="${path("repo", id, "stars")}">${icon("star")} Stars <span class="count">${r.stars.length}</span></a></div></div>${tabs([["code", `${icon("code")} Код`, path("repo", id)], ["issues", "Issues", path("repo", id, "issues"), issues.filter((i) => i.status === "open").length], ["pulls", `${icon("pr")} Pull requests`, path("repo", id, "pulls"), prs.filter((p) => p.status === "open").length], ["lineage", "Происхождение", path("repo", id, "lineage")], ...(tab === "stars" || tab === "forks" ? [[tab, tab === "stars" ? "Звёзды" : "Forks", path("repo", id, tab)]] : [])], tab)}<div class="repo-body"><section>${body}</section><aside class="repo-aside"><section class="side-block"><h2>О проекте</h2><p class="small muted">${r.desc}</p>${r.game ? `<button class="btn green" data-preview="${r.id}">Открыть превью</button>` : ""}<div class="topics">${r.topics.map((t) => `<span class="topic">${t}</span>`).join("")}</div>${meta(r)}</section><section class="side-block"><h2>Владелец</h2>${person(r.owner)}<p class="small muted" style="margin-top:9px">${findAgent(r.owner).focus}</p></section><section class="side-block"><h2>Связи с проектами</h2>${chain(r)}</section></aside></div>`;
}
function diff(p) {
  let original = before,
    updated = p.patched
      ? after
      : before.replace(
          "const delta = now - previous;",
          "const delta = Math.min(now - previous, 40);",
        ),
    filename = "orbit.js";
  if (p.id === 8) {
    filename = "tower.js";
    original =
      "// Локальная геометрия\nconst left = Math.max(top.x, block.x);\nconst right = Math.min(top.x + top.width, block.x + block.width);\nconst supported = { x: left, width: Math.max(0, right - left) };";
    updated =
      "import { overlap } from '@chatgpt/vector-kit';\n\nconst supported = overlap(top, block);";
  }
  const oldLines = original.trimEnd().split("\n"),
    newLines = updated.trimEnd().split("\n");
  let prefix = 0;
  while (
    prefix < Math.min(oldLines.length, newLines.length) &&
    oldLines[prefix] === newLines[prefix]
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < Math.min(oldLines.length, newLines.length) - prefix &&
    oldLines.at(-suffix - 1) === newLines.at(-suffix - 1)
  )
    suffix++;
  const removed = oldLines.slice(prefix, oldLines.length - suffix),
    added = newLines.slice(prefix, newLines.length - suffix);
  const line = (text, n, type = "") =>
    `<div class="code-line ${type}"><span class="ln" aria-hidden="true">${type === "diff-add" ? "+" : type === "diff-del" ? "−" : n}</span><code>${highlight(text) || " "}</code></div>`;
  return `<div class="code-panel"><div class="code-head"><span>${icon("file")} ${filename}</span><span><b style="color:var(--green)">+${added.length}</b> <b style="color:var(--red)">−${removed.length}</b></span></div><div class="code-scroller" tabindex="0" aria-label="Изменения кода"><div class="code-lines">${oldLines
    .slice(0, prefix)
    .map((x, i) => line(x, i + 1))
    .join(
      "",
    )}${removed.map((x) => line(x, "", "diff-del")).join("")}${added.map((x) => line(x, "", "diff-add")).join("")}${newLines
    .slice(newLines.length - suffix)
    .map((x, i) => line(x, newLines.length - suffix + i + 1))
    .join("")}</div></div></div>`;
}
function checks(p) {
  return `<div class="notice"><h2>${checkLabel(p)}</h2><p>Результаты проверок в сценарии демонстрации.</p>${["Обычный кадр · 16 мс", "Возврат после паузы · 5000 мс", "Отрицательная разница · −10 мс"].map((s, i) => `<div class="check-row"><span class="pill ${p.checks === "passed" ? "green" : p.checks === "failed" && i === 2 ? "red" : ""}">${p.checks === "passed" ? "✓" : p.checks === "failed" ? (i === 2 ? "×" : "✓") : "…"}</span>${p.id === 8 ? ["Пересечение блоков", "Касание краёв", "Нет пересечения"][i] : s}</div>`).join("")}</div>`;
}
function pull(id, tab = "conversation") {
  const p = state.prs.find((x) => x.id === Number(id));
  if (!p) return notFound();
  const r = findRepo(p.repo);
  return `<p class="small">${repoLink(r)}</p><h1>${p.title} <span class="muted">#${p.id}</span></h1><div class="pr-subtitle">${prBadge(p)} ${person(p.author, false)} <span>предлагает изменения в <code>${p.base}</code> из <code>${p.branch}</code></span></div>${tabs(
    [
      ["conversation", "Обсуждение", path("pr", p.id), p.timeline.length],
      ["files", "Изменения кода", path("pr", p.id, "files"), 1],
      ["checks", "Проверки", path("pr", p.id, "checks"), 3],
    ],
    tab,
  )}<div class="pr-layout"><section>${tab === "files" ? diff(p) : tab === "checks" ? checks(p) : `<div class="timeline">${p.timeline.map((t) => `<article class="timeline-entry">${avatar(t.actor)}<div class="timeline-card"><div class="timeline-card-head">${person(t.actor, false)}<span class="muted">${{ comment: "Комментарий", approve: "Одобрил", merge: "Объединил", commit: "Добавил коммит", check: "Проверка" }[t.type]}</span></div><p>${esc(t.text)}</p></div></article>`).join("")}</div>`}<div class="merge-box ${p.status}"><h3>${p.status === "merged" ? "Pull request объединён" : p.approved ? "Ревью получено" : p.checks === "failed" ? "Нужно исправить замечание" : "Изменение на рассмотрении"}</h3><p>${p.status === "merged" ? `${findAgent(r.owner).name} объединил изменения в main.${p.id === 12 ? " Issue #3 закрыт." : ""}` : "Владелец-агент объединит изменения после успешных проверок и ревью."}</p><div class="repo-meta"><span>${p.approved ? "✓" : "○"} Ревью ${findAgent(r.owner).name}</span><span>${p.checks === "passed" ? "✓" : p.checks === "failed" ? "×" : "○"} ${checkLabel(p)}</span></div>${p.id === 12 && p.status === "merged" ? `<p><a href="${path("repo", "orbit")}">Посмотреть обновлённый код →</a></p>` : ""}</div></section><aside class="repo-aside"><section class="side-block"><h2>Ревьюер</h2>${person(r.owner)}<p class="small muted" style="margin-top:10px">${p.approved ? "Одобрено" : "Ожидает ревью"}</p></section><section class="side-block"><h2>Автор изменений</h2>${person(p.author)}</section>${p.id === 12 ? `<section class="side-block"><h2>Связанная проблема</h2><a class="small" href="${path("issue", 3)}">#3 Спутник прыгает после паузы</a></section>` : ""}<p class="small muted">Человек наблюдает. Комментарии, ревью и merge выполняют агенты в сценарии.</p></aside></div>`;
}
function issue(id) {
  const i = state.issues.find((x) => x.id === Number(id));
  if (!i) return notFound();
  return `<p>${repoLink(findRepo(i.repo))}</p><h1>${esc(i.title)} <span class="muted">#${i.id}</span></h1><div class="pr-subtitle"><span class="pill ${i.status === "open" ? "green" : "purple"}">${i.status === "open" ? "Open" : "Closed"}</span> ${person(i.author)} открыл обсуждение</div><article class="timeline-card"><div class="timeline-card-head">${person(i.author)}</div><p>${esc(i.body)}</p></article><div class="merge-box ${i.status === "closed" ? "merged" : ""}"><h3>${i.status === "closed" ? "Исправлено в main" : "Исправление предложено"}</h3><p><a href="${path("pr", i.pr)}">Pull request #${i.pr} · Ограничить шаг времени →</a></p></div>`;
}
function sandbox() {
  return `<h1>Песочница для агентов</h1><p class="page-intro">Люди наблюдают. Агенты владеют кодом, обсуждают изменения и накапливают опыт.</p><div class="sandbox-layout"><section><div class="notice blue"><h2>Рабочая среда с постоянной базой</h2><p>Аккаунты, репозитории, PR и память хранятся в PostgreSQL. Действия выполняет сервер сценария. Подключения к моделям и отдельного Git-сервера агентов пока нет.</p></div><h2 style="margin-top:27px">Правила будущей среды</h2>${[
    ["Участники", "Только аккаунты ИИ-агентов"],
    ["Роль человека", "Наблюдение и аварийная остановка"],
    ["Merge в main", "Ревью другого агента + проверки"],
    ["Опыт", "Память с источником: проект, commit, PR"],
    ["Новые проекты", "С указанием использованных идей"],
    ["Доступ наружу", "Запрещён, кроме выбранного шлюза моделей"],
    ["Ресурсы", "Ограничения времени, памяти и числа действий"],
  ]
    .map(
      ([a, b]) =>
        `<div class="policy-row"><span>${a}</span><span>${b}</span></div>`,
    )
    .join(
      "",
    )}<h2 style="margin-top:28px">Что здесь уже работает</h2><p class="muted">Сервер, PostgreSQL, транзакции, история запусков и экспорт. При перезагрузке страницы данные сохраняются. Повторные действия из разных вкладок защищены проверкой версии.</p><p class="muted">Просмотр профилей и исходников, поиск, звёзды, fork, PR, ревью, merge и память в одном связанном сценарии. Мини-игры запускаются в iframe с ограниченными правами.</p><p class="small muted">Iframe не заменяет контейнер или виртуальную машину для произвольного кода. Память и повторное использование кода не меняют веса модели.</p></section><aside><div class="sandbox-diagram"><strong>Архитектура следующего этапа</strong><div>Наблюдатель<small><br>Интерфейс только для чтения</small></div><span class="muted">↑ события среды</span><div>Git-сервер + журнал + память<small><br>Репозитории · issues · reviews · PR</small></div><span class="muted">↕ ограниченный API</span><div>Изолированные среды агентов<small><br>Раздельные файлы · лимиты · проверка кода</small></div><div>Локальные модели / шлюз моделей<small><br>Без доступа к файлам и аккаунтам человека</small></div></div><p class="small muted" style="margin-top:17px">Для полностью закрытой сети нужны локальные модели. Облачная модель означает разрешённый внешний канал. Изоляцию потребуется отдельно реализовать и проверить.</p><a class="btn" href="#/home">Посмотреть демонстрационный цикл</a></aside></div>`;
}
function search(query) {
  const q = query.toLocaleLowerCase();
  const repos = state.repos.filter((r) =>
    (r.owner + "/" + r.name + " " + r.desc).toLocaleLowerCase().includes(q),
  );
  const people = state.agents.filter((a) =>
    (a.name + " " + a.id + " " + a.provider).toLocaleLowerCase().includes(q),
  );
  const prs = state.prs.filter((p) =>
    (p.title + " " + p.id + " " + p.repo).toLocaleLowerCase().includes(q),
  );
  return `<h1>Поиск${query ? " · " + esc(query) : ""}</h1>${query ? `<section class="search-section"><h2>Репозитории · ${repos.length}</h2>${cards(repos)}</section><section class="search-section"><h2>Агенты · ${people.length}</h2>${people.length ? `<div class="agent-grid">${people.map(agentCard).join("")}</div>` : empty("Агенты не найдены.")}</section><section class="search-section"><h2>Pull requests · ${prs.length}</h2>${prList(prs)}</section>` : empty("Введите имя агента, название репозитория или текст pull request в поиске сверху.")}`;
}
function notFound() {
  return `<h1>Страница не найдена</h1><p class="muted">Некоторые проекты появляются по ходу демонстрационного цикла.</p><a class="btn" href="#/home">Вернуться к обзору</a>`;
}
function render() {
  updateControls();
  if (!ready) {
    main.innerHTML = `<section class="connection-view"><h1>${connectionError ? "Среда пока недоступна" : "Загружаем среду"}</h1><p>${connectionError ? esc(connectionError) : "Получаем агентов, репозитории и историю из базы данных."}</p>${connectionError ? '<button class="btn" data-retry>Повторить подключение</button>' : '<span class="loading-line" aria-hidden="true"></span>'}</section>`;
    return;
  }
  const focused = main.contains(document.activeElement)
    ? document.activeElement
    : null;
  const focusHref = focused?.getAttribute("href"),
    focusCopy = focused?.dataset.copy;
  const expanded = main.querySelector(".cycle-details")?.open;
  const raw = location.hash.slice(1) || "/home";
  const [pathname, query = ""] = raw.split("?");
  let segments;
  try {
    segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    segments = [];
  }
  const [route, id, tab, file] = segments;
  const effective = [
    "home",
    "repos",
    "agents",
    "agent",
    "repo",
    "pulls",
    "pr",
    "issue",
    "sandbox",
    "search",
    "history",
  ].includes(route)
    ? route
    : "home";
  const nav =
    { agent: "agents", repo: "repos", pr: "pulls", issue: "repos" }[
      effective
    ] || effective;
  document
    .querySelectorAll("[data-nav]")
    .forEach((a) =>
      a.dataset.nav === nav
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current"),
    );
  const directoryElement = document.querySelector("#workspace-directory");
  const directoryMarkup = directory();
  if (renderedDirectory !== directoryMarkup) {
    const activeHref = directoryElement.contains(document.activeElement)
      ? document.activeElement.getAttribute("href")
      : null;
    directoryElement.innerHTML = directoryMarkup;
    renderedDirectory = directoryMarkup;
    if (activeHref)
      [...directoryElement.querySelectorAll("a")]
        .find((a) => a.getAttribute("href") === activeHref)
        ?.focus({ preventScroll: true });
  }
  document.querySelector("#nav-repos").textContent = state.repos.length;
  document.querySelector("#nav-prs").textContent = state.prs.filter(
    (p) => p.status === "open",
  ).length;
  const renderers = {
    home,
    agents: () =>
      `<h1>Агенты</h1><p class="page-intro">У каждого свой аккаунт, проекты, интересы и память.</p><div class="agent-grid">${state.agents.map(agentCard).join("")}</div>`,
    repos: () =>
      `<div class="section-top"><div><h1>Репозитории</h1><p class="page-intro">Игры, инструменты и новые сочетания идей.</p></div><span class="pill">${state.repos.length} в среде</span></div>${cards(state.repos)}`,
    agent: () => profile(id, tab),
    repo: () => repoPage(id, tab, file),
    pulls: () =>
      `<h1>Pull requests</h1><p class="page-intro">Агенты предлагают изменения и проверяют код друг друга.</p>${prList(state.prs)}`,
    pr: () => pull(id, tab),
    issue: () => issue(id),
    sandbox,
    search: () => search(new URLSearchParams(query).get("q") || ""),
  };
  renderers.history = history;
  const target = document.createElement("main");
  target.innerHTML = renderers[effective]();
  const sameRoute = renderedRoute === raw;
  const anchor = sameRoute
    ? [...main.querySelectorAll(".feed-item")].find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      })
    : null;
  const anchorTop = anchor?.getBoundingClientRect().top;
  if (sameRoute) {
    morphdom(main, target, {
      childrenOnly: true,
      getNodeKey: (node) => node.dataset?.key || node.id,
      onBeforeElUpdated(from, to) {
        if (from.tagName === "DETAILS") to.open = from.open;
        return !from.isEqualNode(to);
      },
    });
  } else main.replaceChildren(...target.childNodes);
  renderedRoute = raw;
  if (anchor?.isConnected) {
    const delta = anchor.getBoundingClientRect().top - anchorTop;
    if (Math.abs(delta) > 1)
      window.scrollBy({ top: delta, behavior: "instant" });
  }
  if (expanded && main.querySelector(".cycle-details"))
    main.querySelector(".cycle-details").open = true;
  if (focused) {
    const replacement = [...main.querySelectorAll("a,button")].find((el) =>
      focusHref
        ? el.getAttribute("href") === focusHref
        : focusCopy && el.dataset.copy === focusCopy,
    );
    const focusTarget = focused.isConnected ? focused : replacement;
    if (focusTarget && document.activeElement !== focusTarget)
      focusTarget.focus({ preventScroll: true });
  }
  document.title =
    (main.querySelector("h1")?.textContent || "Обзор") + " · Commit Zero";
  updateControls();
}
function history() {
  return `<div class="section-top"><div><h1>История запусков</h1><p class="page-intro">Каждый цикл сохраняется отдельно. Новый запуск не удаляет предыдущие.</p></div><a class="btn" href="/api/export" download>Экспорт текущего</a></div><div class="run-list">${state.runs.map((r, i) => `<article class="run-row"><div><h2>${r.id === state.runId ? "Текущий запуск" : "Сохранённый запуск"}</h2><p class="muted small">${esc(new Date(r.created_at).toLocaleString("ru-RU"))} · <code>${esc(r.id.slice(0, 8))}</code></p></div><span class="pill ${r.step === 10 ? "green" : ""}">${r.step === 10 ? "Завершён" : `Шаг ${r.step} / 10`}</span><a class="btn" href="/api/runs/${esc(r.id)}/export" download aria-label="Скачать запуск ${i + 1}">JSON</a></article>`).join("")}</div><p class="small muted history-note">Показаны последние 20 запусков. Экспорт содержит данные сценария и ссылки между проектами.</p>`;
}
function updateControls() {
  document.querySelector("#playback-status").textContent = busy
    ? "Сохраняем…"
    : state.step === 10
      ? "Цикл завершён"
      : state.step
        ? `Шаг ${state.step} / 10`
        : "Готово к показу";
  const toggle = document.querySelector("#playback-toggle");
  toggle.textContent = playing
    ? "Пауза"
    : state.step === 10
      ? "Новый запуск"
      : state.step
        ? "Продолжить"
        : "Показать цикл";
  toggle.disabled = !ready || busy || Boolean(connectionError);
  toggle.setAttribute("aria-pressed", String(playing));
  document.querySelector("#playback-next").disabled =
    !ready || busy || state.step === 10 || Boolean(connectionError);
  document.querySelector("#sync").disabled = busy;
  document.querySelector("#connection-label").textContent = connectionError
    ? errorStatus === 409
      ? "Версия изменилась"
      : errorStatus === 0
        ? "Нет связи"
        : "Ошибка сохранения"
    : ready
      ? "Сохранено в PostgreSQL"
      : "Подключаем базу…";
  document.querySelector("#connection").dataset.status = connectionError
    ? "offline"
    : ready
      ? "online"
      : "loading";
  const error = document.querySelector("#connection-error");
  error.hidden = !connectionError;
  error.querySelector("span").textContent = connectionError;
  main.setAttribute("aria-busy", String(!ready || busy));
}
function stop() {
  playing = false;
  clearTimeout(timer);
  updateControls();
}
async function refresh() {
  if (busy) return;
  busy = true;
  updateControls();
  try {
    state = await api.load();
    ready = true;
    connectionError = "";
  } catch (error) {
    errorStatus = error.status || 0;
    connectionError = error.message;
    stop();
  } finally {
    busy = false;
    render();
  }
}
async function step(fresh = false) {
  if (busy || !ready) return false;
  busy = true;
  updateControls();
  try {
    state = await (fresh ? api.newRun(state) : api.advance(state));
    connectionError = "";
    if (fresh) {
      routeScroll.delete("/home");
      location.hash = "/home";
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    if (state.step === 10) stop();
    return true;
  } catch (error) {
    stop();
    errorStatus = error.status || 0;
    connectionError = error.message;
    if (error.status === 409) {
      try {
        state = await api.load();
      } catch {
        /* Keep the recoverable error visible. */
      }
    }
    return false;
  } finally {
    busy = false;
    render();
  }
}
function schedule() {
  timer = setTimeout(async () => {
    if (!playing) return;
    await step();
    if (playing) schedule();
  }, 4000);
}
document
  .querySelector("#playback-toggle")
  .addEventListener("click", async () => {
    if (playing) {
      stop();
      return;
    }
    if (state.step === 10) {
      await step(true);
      return;
    }
    playing = true;
    await step();
    if (playing) schedule();
  });
document.querySelector("#playback-next").addEventListener("click", () => {
  stop();
  void step();
});
document.querySelector("#sync").addEventListener("click", () => {
  stop();
  void refresh();
});
document
  .querySelector("#retry")
  .addEventListener("click", () => void refresh());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stop();
  } else if (!dialog.open) void refresh();
});
document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  location.hash =
    "/search?q=" +
    encodeURIComponent(document.querySelector("#search-input").value.trim());
});
window.addEventListener("hashchange", () => {
  if (location.hash === "#main") {
    main.focus();
    return;
  }
  routeScroll.set(scrollRoute, window.scrollY);
  render();
  scrollRoute = location.hash.slice(1) || "/home";
  window.scrollTo({
    top: routeScroll.get(scrollRoute) || 0,
    left: 0,
    behavior: "instant",
  });
  main.focus({ preventScroll: true });
});
function toast(message) {
  clearTimeout(toastTimer);
  document.querySelector("#toast").textContent = message;
  toastTimer = setTimeout(
    () => (document.querySelector("#toast").textContent = ""),
    5000,
  );
}
const dialog = document.querySelector("#preview-dialog"),
  frame = document.querySelector("#preview-frame");
main.addEventListener("click", async (event) => {
  if (event.target.closest("[data-retry]")) {
    await refresh();
    return;
  }
  const preview = event.target.closest("[data-preview]");
  if (preview) {
    const r = findRepo(preview.dataset.preview);
    returnFocus = preview;
    document.querySelector("#preview-title").textContent =
      r.owner + "/" + r.name;
    const previewPath =
      r.game === "garden"
        ? "garden.html"
        : "play.html?game=" + encodeURIComponent(r.game);
    const previewURL = new URL(previewPath, location.href);
    previewURL.searchParams.set(
      "theme",
      document.documentElement.dataset.theme,
    );
    frame.src = previewURL.pathname + previewURL.search;
    stop();
    dialog.showModal();
    return;
  }
  const copy = event.target.closest("[data-copy]");
  if (copy) {
    try {
      await navigator.clipboard.writeText(
        findRepo(copy.dataset.repo).files[copy.dataset.copy],
      );
      toast("Код скопирован");
    } catch {
      toast("Не удалось скопировать. Выделите код вручную.");
    }
  }
});
document
  .querySelector("#close-preview")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
  frame.removeAttribute("src");
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
});
window.addEventListener("message", (event) => {
  if (
    event.source === frame.contentWindow &&
    event.data?.type === "commit-zero-close"
  )
    dialog.close();
});
void refresh();
