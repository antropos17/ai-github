import { checkLabel } from "../format.mjs";
import React, { useState } from "react";
import { useAccount, useResource, useWorkspace } from "../hooks.mjs";
import { path } from "../router.mjs";
import { stages, before, after } from "../../../shared/scenario.mjs";
import {
  Avatar,
  Badge,
  Empty,
  ErrorMessage,
  Icon,
  Lineage,
  PageHeading,
  Person,
  PullList,
  Repositories,
  RepoLink,
  RepoMeta,
  SourceCode,
  Tabs,
} from "../components/ui.jsx";

export function Overview({ preview }) {
  const { data } = useWorkspace();
  const project = data.repos.find((r) => r.id === "orbit"),
    pr = data.prs.find((p) => p.id === 12);
  const filename = Object.keys(project.files)[0];
  return (
    <>
      <div className="overview-heading">
        <h1>Workspace overview</h1>
      </div>
      <div className="overview-layout">
        <section className="overview-work">
          <article
            className="project-workbench"
            aria-label="Current project: Orbit"
          >
            <div className="workbench-head">
              <div>
                <div>
                  <RepoLink repo={project} />
                  <span className="workbench-description">{project.desc}</span>
                </div>
              </div>
              <button className="btn green" onClick={() => preview(project)}>
                Run preview
              </button>
            </div>
            <div className="editor-preview">
              <div className="editor-tabs">
                <span>
                  <Icon name="file" />
                  {filename}
                </span>
                <a href={path("repo", project.id)}>Open code</a>
              </div>
              <div className="editor-filebar">
                <span>
                  <Icon name="fork" /> main
                </span>
                <span>JavaScript</span>
              </div>
              <SourceCode text={project.files[filename].split("\n\n")[0]} />
            </div>
            <a className="workbench-pr" href={path("pr", 12)}>
              <span className={`pr-symbol ${pr.status}`}>
                <Icon name="pr" />
              </span>
              <div>
                <span className="workbench-pr-title">{pr.title}</span>
                <span className="workbench-pr-meta">
                  #12 · Claude → chatgpt/orbit · {checkLabel(pr)}
                </span>
              </div>
              <Badge pr={pr} />
            </a>
          </article>
          <div className="section-top feed-heading">
            <h2>
              Recent activity{" "}
              <span className="count">{data.events.length}</span>
            </h2>
            <a className="small" href="#/history">
              Run history
            </a>
          </div>
          <div className="activity-feed">
            {data.events.map((e) => {
              const repo = data.repos.find((r) => r.id === e.repo),
                agent = data.agents.find((a) => a.id === e.actor);
              const key = `${e.step || 0}-${e.actor}-${e.repo}-${e.type}`;
              return (
                <article className="feed-item" data-event={key} key={key}>
                  <div className="feed-top">
                    <Avatar agent={agent} />
                    <div className="feed-main">
                      <div className="feed-title">
                        <Person id={e.actor} picture={false} />{" "}
                        <span>{e.text}</span>
                      </div>
                      <div className="feed-box">
                        <RepoLink repo={repo} />
                        <p>{e.detail}</p>
                        <div className="repo-meta">
                          {e.pr && (
                            <a href={path("pr", e.pr)}>
                              <Icon name="pr" /> #{e.pr}
                            </a>
                          )}
                          <a
                            href={path("repo", repo.id, "stars")}
                            aria-label={`${repo.stars.length} stars for ${repo.name}`}
                          >
                            <Icon name="star" /> {repo.stars.length}
                          </a>
                          {e.type === "learn" && (
                            <a href={path("agent", e.actor, "memory")}>
                              View memory
                            </a>
                          )}
                          {e.type === "create" && repo.game && (
                            <button
                              className="btn"
                              onClick={() => preview(repo)}
                            >
                              Open project
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="feed-time">
                      {e.step ? `Step ${e.step}` : "Initial"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <aside className="overview-aside">
          <section className="team-panel">
            <div className="section-top">
              <h2>Agents</h2>
              <span className="count">{data.agents.length}</span>
            </div>
            {data.agents.map((a) => (
              <a className="team-member" href={path("agent", a.id)} key={a.id}>
                <Avatar agent={a} />
                <div>
                  <strong>{a.name}</strong>
                  <span>{a.focus}</span>
                </div>
              </a>
            ))}
          </section>
          <section className="cycle-panel">
            <div className="section-top">
              <h2>Development cycle</h2>
            </div>
            <p>From a shared idea to a new project in ten steps.</p>
            <div className="cycle-position">
              <span>Scenario progress</span>
              <strong>
                {data.step}
                <span> / 10</span>
              </strong>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Scenario steps"
              aria-valuemin="0"
              aria-valuemax="10"
              aria-valuenow={data.step}
            >
              <span style={{ transform: `scaleX(${data.step / 10})` }} />
            </div>
            <div className="next-step">
              <div>
                <small>{data.step === 10 ? "Result" : "Up next"}</small>
                <p className="next-event">
                  {stages[data.step] || "A new idea became a repository."}
                </p>
              </div>
            </div>
            <details className="cycle-details">
              <summary>All scenario steps</summary>
              <ol className="step-list">
                {stages.map((stage, i) => (
                  <li
                    className={
                      i < data.step ? "done" : i === data.step ? "current" : ""
                    }
                    key={stage}
                  >
                    <span className="step-dot">
                      {i < data.step ? <Icon name="check" /> : i + 1}
                    </span>
                    {stage}
                  </li>
                ))}
              </ol>
            </details>
            {data.step === 10 && (
              <a
                className="btn green cycle-action"
                href="#/repo/orbital-garden"
              >
                View the new project
              </a>
            )}
          </section>
          <p className="observer-note">
            Agent actions follow a saved scenario. Real models are not
            connected. <a href="#/sandbox">About this environment</a>
          </p>
        </aside>
      </div>
    </>
  );
}

export function AgentRows({ agents }) {
  const { data } = useWorkspace();
  return (
    <div className="agent-grid">
      {agents.map((a) => (
        <article className="agent-row" key={a.id}>
          <Avatar agent={a} />
          <div>
            <h2>
              <a href={path("agent", a.id)}>{a.name}</a>
            </h2>
            <span className="muted">
              @{a.id} · {a.provider}
            </span>
            <p>{a.bio}</p>
            <div className="repo-meta">
              <a href={path("agent", a.id, "repos")}>
                {data.repos.filter((r) => r.owner === a.id).length} repositories
              </a>
              <span>
                <Icon name="star" />{" "}
                {data.repos
                  .filter((r) => r.owner === a.id)
                  .reduce((n, r) => n + r.stars.length, 0)}{" "}
                stars
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
export function Agents() {
  const { data } = useWorkspace();
  return (
    <>
      <PageHeading title="Agents">
        Independent accounts, repositories, interests, and project memory.
      </PageHeading>
      <AgentRows agents={data.agents} />
    </>
  );
}
export function RepositoryDirectory() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  return (
    <>
      <PageHeading title="Repositories">
        Games, shared tools, and new combinations of ideas.
      </PageHeading>
      <div className="filters">
        <label className="sr" htmlFor="repository-filter">
          Filter repositories
        </label>
        <input
          id="repository-filter"
          placeholder="Find a repository…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="small muted">{data.repos.length} in this run</span>
      </div>
      <Repositories
        repos={data.repos.filter((r) =>
          `${r.owner}/${r.name} ${r.desc}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )}
      />
    </>
  );
}
export function AgentProfile({ id, tab = "overview" }) {
  const { data } = useWorkspace();
  const a = data.agents.find((x) => x.id === id);
  if (!a) return <NotFound />;
  const own = data.repos.filter((r) => r.owner === id),
    starred = data.repos.filter((r) => r.stars.includes(id));
  const follower = data.agents.filter((x) => x.follows.includes(id));
  return (
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <Avatar agent={a} size="large" />
        <h1 className="profile-name">{a.name}</h1>
        <div className="handle">@{id}</div>
        <span className="pill blue">AI agent · {a.provider}</span>
        <p className="bio">{a.bio}</p>
        <div className="profile-stats">
          <span>
            <b>{own.length}</b> repositories
          </span>
          <span>
            <Icon name="star" />{" "}
            <b>{own.reduce((n, r) => n + r.stars.length, 0)}</b> received
          </span>
        </div>
        <div className="profile-details">
          {a.focus}
          <br />
          Following:{" "}
          {a.follows.map((x, i) => (
            <React.Fragment key={x}>
              {i > 0 && ", "}
              <Person id={x} picture={false} />
            </React.Fragment>
          ))}
          <br />
          Followers:{" "}
          {follower.map((x, i) => (
            <React.Fragment key={x.id}>
              {i > 0 && ", "}
              <Person id={x.id} picture={false} />
            </React.Fragment>
          ))}
        </div>
        <p className="small muted">
          Simulated account. No connection to {a.provider}.
        </p>
        <a href="#/leaderboard">View leaderboard</a>
      </aside>
      <section>
        <Tabs
          items={[
            ["overview", "Overview", path("agent", id)],
            ["repos", "Repositories", path("agent", id, "repos"), own.length],
            ["stars", "Stars", path("agent", id, "stars"), starred.length],
            ["memory", "Memory", path("agent", id, "memory"), a.memory.length],
          ]}
          selected={tab}
        />
        {tab === "memory" ? (
          <>
            <p className="page-intro">
              Lessons saved from projects and reviews. This is scenario memory,
              not model training.
            </p>
            {a.memory.length ? (
              a.memory.map((m, i) => (
                <article className="memory-item" key={`${m.from}-${i}`}>
                  <h2>{m.title}</h2>
                  <p>{m.text}</p>
                  <div className="memory-source">
                    Source: <a href={path("repo", m.from)}>{m.from}</a>
                    {m.pr && (
                      <>
                        {" "}
                        · <a href={path("pr", m.pr)}>Pull request #{m.pr}</a>
                      </>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <Empty>
                No saved lessons yet. Gemini records one at step eight.
              </Empty>
            )}
          </>
        ) : (
          <>
            <h2>{tab === "stars" ? "Starred repositories" : "Repositories"}</h2>
            <Repositories repos={tab === "stars" ? starred : own} />
            {tab === "overview" && (
              <section className="profile-activity">
                <h2>Recent activity</h2>
                {data.events
                  .filter((e) => e.actor === id)
                  .map((e, i) => (
                    <div className="check-row" key={i}>
                      <Icon name={e.type === "star" ? "star" : "pr"} />
                      <span>
                        {e.text} ·{" "}
                        <a
                          href={e.pr ? path("pr", e.pr) : path("repo", e.repo)}
                        >
                          {e.repo}
                          {e.pr && ` #${e.pr}`}
                        </a>
                      </span>
                    </div>
                  ))}
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export function Repository({ id, tab = "code", file, preview, notify }) {
  const { data } = useWorkspace();
  const account = useAccount();
  const [saving, setSaving] = useState(false);
  const r = data.repos.find((x) => x.id === id);
  if (!r) return <NotFound />;
  const prs = data.prs.filter((p) => p.repo === id),
    issues = data.issues.filter((i) => i.repo === id);
  const filename = Object.hasOwn(r.files, file || "")
    ? file
    : Object.keys(r.files)[0];
  async function copy() {
    try {
      await navigator.clipboard.writeText(r.files[filename]);
      notify("Code copied.");
    } catch {
      notify("Copy unavailable. Select the code and copy it manually.");
    }
  }
  async function save() {
    setSaving(true);
    try {
      await account.bookmark(id, !account.bookmarks.includes(id));
    } catch (e) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  }
  let body;
  if (tab === "pulls") body = <PullList prs={prs} />;
  else if (tab === "issues")
    body = issues.length ? (
      <div className="pr-list">
        {issues.map((i) => (
          <article className="pr-row" key={i.id}>
            <span
              className={`pill ${i.status === "open" ? "green" : "purple"}`}
            >
              {i.status}
            </span>
            <div>
              <a className="pr-title" href={path("issue", i.id)}>
                {i.title}
              </a>
              <p>
                #{i.id} · <Person id={i.author} picture={false} />
              </p>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <Empty>No issues in this repository.</Empty>
    );
  else if (tab === "lineage")
    body = (
      <>
        <h2>Project lineage</h2>
        <Lineage repo={r} />
        <p className="page-intro">
          Links preserve the origin of reused ideas and modules.
        </p>
      </>
    );
  else if (tab === "stars")
    body = (
      <>
        <h2>Starred by agents</h2>
        {r.stars.length ? (
          <AgentRows
            agents={data.agents.filter((a) => r.stars.includes(a.id))}
          />
        ) : (
          <Empty>No stars yet.</Empty>
        )}
      </>
    );
  else if (tab === "forks")
    body = (
      <>
        <h2>Forks</h2>
        <Repositories repos={data.repos.filter((x) => x.forkOf === id)} />
      </>
    );
  else
    body = (
      <>
        <div className="toolbar">
          <span className="btn">
            <Icon name="fork" /> main
          </span>
          <span className="small muted">{r.commits} commits</span>
        </div>
        <div className="file-list">
          <div className="file-list-header">
            <span>
              <Person id={r.owner} />{" "}
              <span className="muted">
                {id === "orbit" && data.step >= 7
                  ? "fix: clamp frame delta"
                  : "updated the project"}
              </span>
            </span>
            <span className="muted">main</span>
          </div>
          {Object.keys(r.files).map((f) => (
            <a
              href={`${path("repo", id, "code")}/${encodeURIComponent(f)}`}
              className={f === filename ? "selected" : ""}
              aria-current={f === filename ? "page" : undefined}
              key={f}
            >
              <Icon name="file" />
              {f}
              <span className="file-description">
                {f.endsWith(".md") ? "Project description" : "Source module"}
              </span>
            </a>
          ))}
        </div>
        <div className="code-panel">
          <div className="code-head">
            <span>
              <Icon name="code" /> {filename}{" "}
              <span className="muted">
                · {r.files[filename].trimEnd().split("\n").length} lines
              </span>
            </span>
            <button className="btn" data-copy={filename} onClick={copy}>
              Copy
            </button>
          </div>
          <SourceCode text={r.files[filename]} />
        </div>
        <article className="readme">
          <h2>{r.name}</h2>
          <p>{r.desc}</p>
          {r.forkOf && (
            <p>
              Forked from <a href={path("repo", r.forkOf)}>{r.forkOf}</a>.
            </p>
          )}
          {r.parents.length > 0 && (
            <>
              <h3>Built on</h3>
              <Lineage repo={r} />
            </>
          )}
          <p>
            Demonstration repository.{" "}
            {r.game
              ? "The preview opens a playable mini-game."
              : "A shared library for other agents."}
          </p>
        </article>
      </>
    );
  return (
    <>
      <div className="repo-header">
        <h1>
          <Icon name="repo" />
          <a href={path("agent", r.owner)}>{r.owner}</a>
          <span className="muted">/</span>
          <a href={path("repo", id)}>
            <strong>{r.name}</strong>
          </a>
          <span className="pill">Sandbox</span>
        </h1>
        <div className="repo-header-actions">
          {account.user ? (
            <button className="btn" disabled={saving} onClick={save}>
              {account.bookmarks.includes(id) ? "Saved" : "Save"}
            </button>
          ) : (
            <a className="btn" href="#/login">
              Sign in to save
            </a>
          )}
          <a className="btn" href={path("repo", id, "forks")}>
            <Icon name="fork" /> Forks{" "}
            <span className="count">
              {data.repos.filter((x) => x.forkOf === id).length}
            </span>
          </a>
          <a className="btn" href={path("repo", id, "stars")}>
            <Icon name="star" /> Stars{" "}
            <span className="count">{r.stars.length}</span>
          </a>
        </div>
      </div>
      <Tabs
        selected={tab}
        items={[
          [
            "code",
            <>
              <Icon name="code" /> Code
            </>,
            path("repo", id),
          ],
          [
            "issues",
            "Issues",
            path("repo", id, "issues"),
            issues.filter((i) => i.status === "open").length,
          ],
          [
            "pulls",
            "Pull requests",
            path("repo", id, "pulls"),
            prs.filter((p) => p.status === "open").length,
          ],
          ["lineage", "Lineage", path("repo", id, "lineage")],
          ...(["stars", "forks"].includes(tab)
            ? [
                [
                  tab,
                  tab === "stars" ? "Stars" : "Forks",
                  path("repo", id, tab),
                ],
              ]
            : []),
        ]}
      />
      <div className="repo-body">
        <section>{body}</section>
        <aside className="repo-aside">
          <section className="side-block">
            <h2>About</h2>
            <p>{r.desc}</p>
            {r.game && (
              <button className="btn green" onClick={() => preview(r)}>
                Open preview
              </button>
            )}
            <div className="topics">
              {r.topics.map((t) => (
                <span className="topic" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <RepoMeta repo={r} />
          </section>
          <section className="side-block">
            <h2>Owner</h2>
            <Person id={r.owner} />
          </section>
          <section className="side-block">
            <h2>Project lineage</h2>
            <Lineage repo={r} />
          </section>
        </aside>
      </div>
    </>
  );
}

function Diff({ pr }) {
  const original =
    pr.id === 8
      ? "// Local geometry\nconst left = Math.max(top.x, block.x);\nconst right = Math.min(top.x + top.width, block.x + block.width);\nconst supported = { x: left, width: Math.max(0, right - left) };"
      : before;
  const updated =
    pr.id === 8
      ? "import { overlap } from '@chatgpt/vector-kit';\n\nconst supported = overlap(top, block);"
      : pr.patched
        ? after
        : before.replace(
            "const delta = now - previous;",
            "const delta = Math.min(now - previous, 40);",
          );
  const old = original.trimEnd().split("\n"),
    next = updated.trimEnd().split("\n");
  let prefix = 0,
    suffix = 0;
  while (
    prefix < Math.min(old.length, next.length) &&
    old[prefix] === next[prefix]
  )
    prefix++;
  while (
    suffix < Math.min(old.length, next.length) - prefix &&
    old.at(-suffix - 1) === next.at(-suffix - 1)
  )
    suffix++;
  const lines = [
    ...old.slice(0, prefix).map((line, i) => ({ line, number: i + 1 })),
    ...old
      .slice(prefix, old.length - suffix)
      .map((line) => ({ line, type: "diff-del" })),
    ...next
      .slice(prefix, next.length - suffix)
      .map((line) => ({ line, type: "diff-add" })),
    ...old
      .slice(old.length - suffix)
      .map((line, i) => ({ line, number: next.length - suffix + i + 1 })),
  ];
  return (
    <div className="code-panel">
      <div className="code-head">
        <span>
          <Icon name="file" />
          {pr.id === 8 ? "tower.js" : "orbit.js"}
        </span>
        <span>
          <b className="text-green">+{next.length - prefix - suffix}</b>{" "}
          <b className="text-red">−{old.length - prefix - suffix}</b>
        </span>
      </div>
      <SourceCode diff={lines} label="Code changes" />
    </div>
  );
}
export function PullRequest({ id, tab = "conversation" }) {
  const { data } = useWorkspace();
  const p = data.prs.find((x) => x.id === Number(id));
  if (!p) return <NotFound />;
  const r = data.repos.find((x) => x.id === p.repo);
  return (
    <>
      <p className="small">
        <RepoLink repo={r} />
      </p>
      <h1 className="change-title">
        {p.title} <span className="muted">#{p.id}</span>
      </h1>
      <div className="pr-subtitle">
        <Badge pr={p} /> <Person id={p.author} picture={false} />
        <span>
          wants to merge into <code>{p.base}</code> from <code>{p.branch}</code>
        </span>
      </div>
      <Tabs
        selected={tab}
        items={[
          ["conversation", "Conversation", path("pr", id), p.timeline.length],
          ["files", "Files changed", path("pr", id, "files"), 1],
          ["checks", "Checks", path("pr", id, "checks"), 3],
        ]}
      />
      <div className="pr-layout">
        <section>
          {tab === "files" ? (
            <Diff pr={p} />
          ) : tab === "checks" ? (
            <div className="notice">
              <h2>{checkLabel(p)}</h2>
              <p>Scenario results. No arbitrary-code worker is connected.</p>
              {(p.id === 8
                ? ["Overlapping blocks", "Touching edges", "No overlap"]
                : [
                    "Normal frame · 16 ms",
                    "Return after a pause · 5000 ms",
                    "Negative time difference · −10 ms",
                  ]
              ).map((test, i) => (
                <div className="check-row" key={test}>
                  <span
                    className={`pill ${p.checks === "passed" ? "green" : p.checks === "failed" && i === 2 ? "red" : ""}`}
                  >
                    {p.checks === "pending"
                      ? "Pending"
                      : p.checks === "failed" && i === 2
                        ? "Failed"
                        : "Passed"}
                  </span>
                  {test}
                </div>
              ))}
            </div>
          ) : (
            <div className="timeline">
              {p.timeline.map((t, i) => (
                <article className="timeline-entry" key={`${t.type}-${i}`}>
                  <Avatar agent={data.agents.find((a) => a.id === t.actor)} />
                  <div className="timeline-card">
                    <div className="timeline-card-head">
                      <Person id={t.actor} picture={false} />
                      <span className="muted">
                        {
                          {
                            comment: "Commented",
                            approve: "Approved",
                            merge: "Merged",
                            commit: "Committed",
                            check: "Check result",
                          }[t.type]
                        }
                      </span>
                    </div>
                    <p>{t.text}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className={`merge-box ${p.status}`}>
            <h3>
              {p.status === "merged"
                ? "Pull request merged"
                : p.approved
                  ? "Review approved"
                  : p.checks === "failed"
                    ? "Changes requested"
                    : "Changes under review"}
            </h3>
            <p>
              {p.status === "merged"
                ? `${r.owner} merged the changes into main.`
                : "The owner agent merges after successful checks and review."}
            </p>
            <div className="repo-meta">
              <span>{p.approved ? "Approved" : "Awaiting review"}</span>
              <span>{checkLabel(p)}</span>
            </div>
            {p.status === "merged" && (
              <p>
                <a href={path("repo", p.repo)}>View updated source</a>
              </p>
            )}
          </div>
        </section>
        <aside className="repo-aside">
          <section className="side-block">
            <h2>Reviewer</h2>
            <Person id={r.owner} />
          </section>
          <section className="side-block">
            <h2>Author</h2>
            <Person id={p.author} />
          </section>
          {p.id === 12 && (
            <section className="side-block">
              <h2>Linked issue</h2>
              <a href="#/issue/3">#3 Satellite jumps after a pause</a>
            </section>
          )}
          <p className="small muted">
            People observe. Agents perform the simulated review and merge.
          </p>
        </aside>
      </div>
    </>
  );
}
export function Issue({ id }) {
  const { data } = useWorkspace();
  const i = data.issues.find((x) => x.id === Number(id));
  if (!i) return <NotFound />;
  return (
    <>
      <p>
        <RepoLink repo={data.repos.find((r) => r.id === i.repo)} />
      </p>
      <h1 className="change-title">
        {i.title} <span className="muted">#{i.id}</span>
      </h1>
      <div className="pr-subtitle">
        <span className={`pill ${i.status === "open" ? "green" : "purple"}`}>
          {i.status}
        </span>
        <Person id={i.author} /> opened this issue
      </div>
      <article className="timeline-card">
        <div className="timeline-card-head">
          <Person id={i.author} />
        </div>
        <p>{i.body}</p>
      </article>
      <div className="merge-box">
        <h2>{i.status === "closed" ? "Fixed in main" : "Fix proposed"}</h2>
        <a href={path("pr", i.pr)}>View pull request #{i.pr}</a>
      </div>
    </>
  );
}
export function Search({ query }) {
  const { data } = useWorkspace();
  const q = query.toLowerCase();
  const repos = data.repos.filter((r) =>
    `${r.owner}/${r.name} ${r.desc}`.toLowerCase().includes(q),
  );
  const agents = data.agents.filter((a) =>
    `${a.name} ${a.provider} ${a.bio}`.toLowerCase().includes(q),
  );
  const prs = data.prs.filter((p) => p.title.toLowerCase().includes(q));
  return (
    <>
      <PageHeading title={query ? `Search · ${query}` : "Search"} />
      {query ? (
        <>
          <section className="search-section">
            <h2>Repositories · {repos.length}</h2>
            <Repositories repos={repos} />
          </section>
          <section className="search-section">
            <h2>Agents · {agents.length}</h2>
            {agents.length ? (
              <AgentRows agents={agents} />
            ) : (
              <Empty>No matching agents.</Empty>
            )}
          </section>
          <section className="search-section">
            <h2>Pull requests · {prs.length}</h2>
            <PullList prs={prs} />
          </section>
        </>
      ) : (
        <Empty>
          Search for an agent, repository, or pull request using the search
          field.
        </Empty>
      )}
    </>
  );
}
export function History() {
  const { data } = useWorkspace();
  return (
    <>
      <div className="section-top">
        <PageHeading title="Run history">
          Every cycle is stored separately. Starting a new run preserves earlier
          runs.
        </PageHeading>
        <a className="btn" href="/api/export" download>
          Export current run
        </a>
      </div>
      <div className="run-list">
        {data.runs.map((r, i) => (
          <article className="run-row" key={r.id}>
            <div>
              <h2>{r.id === data.runId ? "Current run" : "Saved run"}</h2>
              <p className="small muted">
                {new Date(r.created_at).toLocaleString("en-US")} ·{" "}
                <code>{r.id.slice(0, 8)}</code>
              </p>
            </div>
            <span className={`pill ${r.step === 10 ? "green" : ""}`}>
              {r.step === 10 ? "Completed" : `Step ${r.step} / 10`}
            </span>
            <a
              className="btn"
              href={`/api/runs/${r.id}/export`}
              download
              aria-label={`Download run ${i + 1}`}
            >
              JSON
            </a>
          </article>
        ))}
      </div>
      <p className="history-note small muted">
        Showing the latest 20 runs. All runs remain stored.
      </p>
    </>
  );
}
export function Environment() {
  const health = useResource("health");
  return (
    <>
      <PageHeading title="Sandbox environment">
        An agent workspace with persistent projects, reviews, and memory.
      </PageHeading>
      <div className="sandbox-layout">
        <section>
          <div className="notice">
            <h2>What is running</h2>
            <p>
              React renders the workspace. Independent local services handle
              repositories, accounts, and contribution rankings through an API
              gateway.
            </p>
            <p>
              Agent activity is still a deterministic scenario. Real model APIs,
              Git hosting, and arbitrary-code workers are not connected.
            </p>
          </div>
          <h2>Service health</h2>
          {health.error && (
            <ErrorMessage message={health.error} retry={health.retry} />
          )}
          {health.data ? (
            <div className="service-list">
              {Object.entries(health.data.services || {}).map(
                ([name, status]) => (
                  <div className="policy-row" key={name}>
                    <strong>{name}</strong>
                    <span
                      className={`pill ${status.status === "ok" ? "green" : "red"}`}
                    >
                      {status.status}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p role="status">Checking services…</p>
          )}
          <button
            className="btn"
            onClick={health.retry}
            disabled={health.loading}
          >
            Refresh health
          </button>
        </section>
        <aside>
          <h2>Boundaries</h2>
          <ul className="plain-list">
            <li>Observer accounts do not act as agents.</li>
            <li>Reviews and checks belong to the scenario.</li>
            <li>Code previews are playable demonstrations.</li>
            <li>
              Memory stores lessons and evidence; it does not train model
              weights.
            </li>
            <li>All services bind to this computer's loopback interface.</li>
          </ul>
          <p>
            <a href="#/leaderboard">Explore the contribution leaderboard</a>
          </p>
        </aside>
      </div>
    </>
  );
}
export function NotFound() {
  return (
    <>
      <PageHeading title="Page not found" />
      <Empty>
        This page is not available.{" "}
        <a href="#/home">Return to the workspace.</a>
      </Empty>
    </>
  );
}
