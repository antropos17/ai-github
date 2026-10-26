import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWorkspace, useAccount } from "../hooks.mjs";
import { request } from "../api.mjs";
import { navigateRoute, path } from "../router.mjs";
import {
  projectHistory,
  numberedPulls,
  taskHistory,
} from "../../../shared/commons-history.mjs";
import {
  Activity,
  CodeFiles,
  PullChanges,
  Versions,
  Forks,
  RecordedTime,
  actorNames,
  SourceMessage,
} from "./commons-panels.jsx";
import { ProjectMark } from "../components/project-mark.jsx";
import { Tasks } from "./commons-tasks.jsx";
import { revisionTag } from "../../../shared/revisions.mjs";
import { Projects, ProjectForm, Issues } from "./commons-projects.jsx";
import { cachedCommons, retainCommons } from "./commons-cache.mjs";
import { ProjectContributions } from "../components/project-contributions.jsx";
import { LocalProjectTimeline } from "../components/project-timeline.jsx";
import { useCommonsAgents } from "./commons-agents.mjs";

export function Commons({
  repoId = "",
  embedded = false,
  initialView,
  initialVersion,
  initialPullId,
  initialTaskId,
}) {
  const { data } = useWorkspace();
  return (
    <CommonsRoom
      key={`${data.runId}/${repoId}`}
      runId={data.runId}
      repoId={repoId}
      embedded={embedded}
      initialView={initialView}
      initialVersion={initialVersion}
      initialPullId={initialPullId}
      initialTaskId={initialTaskId}
    />
  );
}
function CommonsRoom({
  runId,
  repoId,
  embedded,
  initialView,
  initialVersion,
  initialPullId,
  initialTaskId,
}) {
  const account = useAccount();
  const [data, setData] = useState(() => cachedCommons(runId)),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(!data);
  const [connectionError, setConnectionError] = useState("");
  const [actionEndpoint, setActionEndpoint] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [provider, setProvider] = useState(null),
    [pending, setPending] = useState(false),
    [checkingProvider, setCheckingProvider] = useState(true),
    [providerError, setProviderError] = useState("");
  const [draft, setDraft] = useState(""),
    [task, setTask] = useState(
      "Find and fix one concrete edge-case bug. Preserve the public API and explain the change.",
    );
  const [target, setTarget] = useState(repoId || ""),
    [localView, setView] = useState(
      initialView || (repoId && !embedded ? "code" : "discussion"),
    );
  const view = embedded ? localView : initialView || (repoId ? "code" : "discussion");
  const [localVersion, setSelectedVersion] = useState(
    initialVersion == null ? null : Number(initialVersion),
  );
  const [localPull, setFocusedPull] = useState(initialPullId || "");
  const [localTask, setSelectedTask] = useState(initialTaskId || "");
  const selectedVersion = embedded ? localVersion : initialVersion == null ? null : Number(initialVersion);
  const focusedPull = embedded ? localPull : initialPullId || "";
  const selectedTask = embedded ? localTask : initialTaskId || "";
  const [timelineTask, setTimelineTask] = useState("");
  const [sourceMessageId, setSourceMessageId] = useState("");
  const [issueId, setIssueId] = useState("");
  const [sourcePrId, setSourcePrId] = useState("");
  const savedAgents = useCommonsAgents(account.user?.id);
  const { agents } = savedAgents;
  const [agentId, setAgentId] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1] || "").get("agent") || "",
  );
  const taskInput = useRef(null);
  const projectInput = useRef(null);
  const focusComposer = useRef(false);
  const composerReturn = useRef({ view: repoId ? "code" : "projects", detail: {} });
  const chatLog = useRef(null);
  const followChat = useRef(true);
  const chatPosition = useRef(0);
  const messageRevision = useRef(0);
  const messageAnchor = useRef(null);
  const [messageWindowStart, setMessageWindowStart] = useState(null);
  useLayoutEffect(() => {
    const log = chatLog.current, anchor = messageAnchor.current;
    if (log && anchor) {
      // The last batch also removes its control, changing the log's viewport.
      log.scrollTop = anchor.top + log.scrollHeight - anchor.height +
        log.getBoundingClientRect().top - anchor.viewportTop;
      if (anchor.trigger && !anchor.trigger.isConnected && document.activeElement === document.body)
        log.focus({ preventScroll: true });
      messageAnchor.current = null;
    }
  }, [messageWindowStart]);
  useLayoutEffect(() => {
    if (view === "discussion" && chatLog.current && !followChat.current)
      chatLog.current.scrollTop = chatPosition.current;
  }, [view]);
  useEffect(() => {
    const log = chatLog.current;
    if (log && followChat.current) log.scrollTop = log.scrollHeight;
  }, [data?.version, view]);
  useEffect(() => {
    if (view === "compose" && (embedded || initialView === "compose") && focusComposer.current) {
      focusComposer.current = false;
      taskInput.current?.focus({ preventScroll: true });
    }
  }, [view, initialView, embedded, sourceMessageId, sourcePrId, issueId]);
  useEffect(() => {
    setView(initialView || (repoId && !embedded ? "code" : "discussion"));
    setSelectedVersion(initialVersion == null ? null : Number(initialVersion));
    setFocusedPull(initialPullId || "");
    setSelectedTask(initialTaskId || "");
  }, [
    initialView,
    initialVersion,
    initialPullId,
    initialTaskId,
    repoId,
    embedded,
  ]);
  const [paused, setPaused] = useState(false);
  const alive = useRef(true);
  const providerRequest = useRef(null);
  const providerOrigin = useRef(null);
  const retryOrigin = useRef(null);
  const latestVersion = useRef(null);
  const receive = useCallback((next) => {
    if (!next) return;
    retainCommons(next);
    latestVersion.current = Math.max(latestVersion.current ?? 0, next.version);
    if (alive.current)
      setData((old) => (!old || next.version >= old.version ? next : old));
  }, []);
  const refresh = useCallback(
    async (signal) => {
      const initialRead = latestVersion.current === null;
      if (initialRead) setLoading(true);
      try {
        const next = await request(`commons?runId=${runId}`, {
          signal,
          etag:
            latestVersion.current === null
              ? undefined
              : revisionTag("commons", runId, latestVersion.current),
        });
        receive(next);
      } finally {
        if (initialRead && !signal?.aborted && alive.current) setLoading(false);
      }
    },
    [runId, receive],
  );
  const checkProvider = useCallback(async (signal, trigger) => {
    if (!alive.current || signal?.aborted) return;
    const controller = new AbortController();
    providerRequest.current?.abort();
    providerRequest.current = controller;
    providerOrigin.current = trigger ? { trigger, hash: location.hash } : null;
    const linked = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;
    setCheckingProvider(true);
    setProviderError("");
    try {
      const next = await request("commons/provider", { signal: linked });
      if (
        typeof next?.available !== "boolean" ||
        typeof next?.busy !== "boolean" ||
        (next.reason !== undefined && typeof next.reason !== "string")
      )
        throw new Error("The service returned invalid model status. Check model to try again.");
      // Only the current check can update status or settle its busy state.
      if (!linked.aborted && providerRequest.current === controller && alive.current) setProvider(next);
    } catch (e) {
      if (!linked.aborted && providerRequest.current === controller && alive.current) {
        setProvider(null);
        setProviderError(e.message);
      }
    } finally {
      if (providerRequest.current === controller) {
        providerRequest.current = null;
        if (!linked.aborted && alive.current) setCheckingProvider(false);
      }
    }
  }, []);
  useLayoutEffect(() => {
    if (loading) return;
    const origin = retryOrigin.current;
    retryOrigin.current = null;
    if (origin && origin.hash === location.hash &&
        (document.activeElement === document.body || document.activeElement === origin.trigger))
      (origin.trigger.isConnected ? origin.trigger : document.getElementById("main"))?.focus({ preventScroll: true });
  }, [loading, data, error]);
  useLayoutEffect(() => {
    if (checkingProvider) return;
    const origin = providerOrigin.current;
    providerOrigin.current = null;
    if (origin && origin.hash === location.hash && origin.trigger.isConnected &&
        (document.activeElement === document.body || document.activeElement === origin.trigger))
      origin.trigger.focus({ preventScroll: true });
  }, [checkingProvider, provider, providerError]);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    let timer;
    const load = async () => {
      try {
        await refresh(controller.signal);
        if (alive.current) setConnectionError("");
      } catch (e) {
        if (!controller.signal.aborted) setConnectionError(e.message);
      }
      if (!controller.signal.aborted && !paused) timer = setTimeout(load, 2500);
    };
    if (!paused) load();
    void checkProvider(controller.signal);
    return () => {
      alive.current = false;
      controller.abort();
      providerRequest.current?.abort();
      providerRequest.current = null;
      providerOrigin.current = null;
      clearTimeout(timer);
    };
  }, [refresh, paused, checkProvider]);
  async function act(endpoint, body, onSuccess) {
    if (!data || pending) return;
    setPending(true);
    setActionEndpoint(endpoint);
    setError("");
    try {
      const next = await request(`commons/${endpoint}`, {
        method: "POST",
        body: { runId, version: data.version, ...body },
      });
      receive(next);
      if (alive.current) onSuccess?.(next);
    } catch (e) {
      if (alive.current) {
        setError(e.message);
        if (e.status === 409) await refresh().catch(() => {});
        if (endpoint === "jobs" && e.status === 503) void checkProvider();
      }
    } finally {
      if (alive.current) setPending(false);
    }
  }
  if (!data)
    return (
      <section aria-busy={loading}>
        <p role={!loading && (error || connectionError) ? "alert" : "status"}>
          {loading ? "Loading workspace…" : error || connectionError}
        </p>
        <button
          className="btn"
          disabled={loading}
          onClick={(event) => {
            retryOrigin.current = { trigger: event.currentTarget, hash: location.hash };
            setError("");
            setConnectionError("");
            void refresh().catch((e) => setError(e.message));
          }}
        >
          Retry
        </button>
      </section>
    );
  const current = data.projects.find((p) => p.id === repoId);
  if (repoId && !current) return <p>Project not found in this workspace.</p>;
  const events = data.events.filter((e) => !repoId || e.repoId === repoId);
  const messages = data.events.filter(
    (e) => e.type === "message" && e.repoId === repoId,
  );
  const messageStart = messageWindowStart === null
    ? Math.max(0, messages.length - 40)
    : Math.max(0, messages.findIndex((event) => event.id === messageWindowStart));
  const visibleMessages = messages.slice(messageStart);
  const allPulls = numberedPulls(data.projects);
  const prs = allPulls.filter((pr) => !repoId || pr.repoId === repoId);
  const running = data.jobs.find((job) => job.status === "running");
  const allJobs = taskHistory(data);
  const jobs = allJobs.filter((job) => !repoId || job.repoId === repoId);
  const activeTask = allJobs.find((job) => job.id === timelineTask);
  const sourceMessage = data.events.find(
    (event) => event.id === sourceMessageId,
  );
  const history = current ? projectHistory(current, data.events) : null;
  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const agentReady = selectedAgent && savedAgents.known && !savedAgents.loading && !savedAgents.error;
  const linkedIssue = (
    data.projects.find((p) => p.id === target)?.issues || []
  ).find((issue) => issue.id === issueId);
  const tabs = current
    ? [
        ["code", "Code"],
        [
          "issues",
          `Issues (${(current.issues || []).filter((issue) => issue.status === "open").length})`,
        ],
        ["tasks", `Tasks (${jobs.length})`],
        ["changes", `Pull requests (${prs.length})`],
        ["discussion", "Chat"],
        ["versions", "Versions"],
        ["forks", `Forks (${current.forks.length})`],
        ["activity", "Timeline"],
      ]
    : [
        ["projects", "Projects"],
        ["discussion", "General chat"],
        ["tasks", `Tasks (${jobs.length})`],
        ["changes", `Pull requests (${prs.length})`],
        ["activity", "Timeline"],
      ];
  const activeView = view === "compose" ? "compose" : tabs.some(([id]) => id === view) ? view : tabs[0][0];
  const workingTask =
    activeView === "tasks" && jobs.find((job) => job.id === selectedTask);
  const workingProject =
    workingTask &&
    data.projects.find((project) => project.id === workingTask.repoId);
  function selectView(next, detail = {}, navigation) {
    if (embedded) {
      setView(next);
      setSelectedVersion(detail.version ?? null);
      setFocusedPull(detail.pull || "");
      setSelectedTask(detail.task || "");
    } else {
      const query = new URLSearchParams({ view: next });
      for (const [key, value] of Object.entries(detail))
        if (value != null && value !== "") query.set(key, String(value));
      if (agentId) query.set("agent", agentId);
      navigateRoute(`${path("commons", repoId)}?${query}`, navigation);
    }
  }
  function openComposer() {
    if (activeView !== "compose") {
      const detail = activeView === "tasks" ? { task: selectedTask }
        : activeView === "changes" ? { pull: focusedPull }
        : activeView === "versions" ? { version: selectedVersion } : {};
      composerReturn.current = { view: activeView, detail, top: window.scrollY };
    }
    focusComposer.current = true;
    selectView("compose");
  }
  function revisePull(pr) {
    const original = allJobs.find((job) => job.id === pr.jobId);
    setSourcePrId(pr.id);
    setSourceMessageId(original?.sourceMessageId || "");
    setIssueId(original?.issueId || "");
    setTarget(pr.repoId);
    openComposer();
  }
  function showPull(id) {
    selectView("changes", { pull: id });
  }
  function showTask(id) {
    selectView("tasks", { task: id });
  }
  function showTaskTimeline(id) {
    setTimelineTask(id);
    selectView("activity");
  }
  function showVersion(projectId, revision) {
    if (projectId !== repoId) {
      location.hash = `/commons/${encodeURIComponent(projectId)}?view=versions&version=${revision}`;
      return;
    }
    selectView("versions", { version: revision });
  }
  const Heading = embedded ? "h2" : "h1";
  return (
    <div className="commons" data-view={activeView}>
      <div className={`commons-layout ${embedded ? "commons-embedded" : ""}`}>
        <div className="commons-main">
          {current && !embedded && (
            <nav className="commons-meta" aria-label="Project location">
              <a className="commons-text-button" href="#/commons?view=projects">All projects</a>
              {" / "}{current.name}
            </nav>
          )}
          <div className="commons-heading">
            <div className="commons-project-name">
              {current && <ProjectMark repo={current} jobs={data.jobs} />}
              <Heading>{current ? current.name : "Agent workspace"}</Heading>
              {current && (
                <button
                  className="commons-version"
                  onClick={() => showVersion(repoId, current.revision)}
                >
                  v{current.revision}
                </button>
              )}
            </div>
            {activeView === "compose" ? (
              <button className="btn" onClick={() => selectView(composerReturn.current.view, composerReturn.current.detail, { scroll: "restore", top: composerReturn.current.top })}>
                Back to {tabs.find(([id]) => id === composerReturn.current.view)?.[1] || "Projects"}
              </button>
            ) : activeView === "projects" ? (
              <button className="btn" onClick={() => projectInput.current?.focus({ preventScroll: true })}>
                New project
              </button>
            ) : (
              <button className="btn" disabled={Boolean(current?.archived)} onClick={openComposer}>
                New task
              </button>
            )}
          </div>
          <div className="commons-toolbar">
            <span className="commons-meta" role="status">
              {paused ? "Updates paused" : "Auto-refresh on"} · Saved local workspace
              {running ? " · Working" : ""}
            </span>
            <div className="commons-actions">
              <button className="btn" onClick={() => setPaused(!paused)}>
                {paused ? "Resume updates" : "Pause updates"}
              </button>
              {current && (
                <span className="commons-meta">
                  {current.stars.length} stars · {current.forks.length} forks
                </span>
              )}
              {current && (
                <button
                  className="btn"
                  aria-pressed={current.stars.includes("operator")}
                  disabled={pending || current.archived}
                  onClick={() =>
                    act("stars", {
                      repoId,
                      starred: !current.stars.includes("operator"),
                    })
                  }
                >
                  {current.stars.includes("operator") ? "Unstar" : "Star"}
                </button>
              )}
              {running && (
                <button
                  className="btn"
                  disabled={pending}
                  onClick={() => act("stop", { jobId: running.id })}
                >
                  Stop
                </button>
              )}
            </div>
          </div>
          <div
            className="commons-views"
            role="group"
            aria-label="Project sections"
          >
            {tabs.map(([id, label]) => (
              <button
                className="btn"
                key={id}
                aria-pressed={activeView === id || (activeView === "compose" && id === "tasks")}
                onClick={() => selectView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {error && !(actionEndpoint === "messages" && activeView === "discussion") && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {connectionError && (
            <p className="inline-error" role="alert">
              Offline. Saved content retained. {connectionError}
            </p>
          )}
          {current?.archived && (
            <p role="status">
              Archived project. History and exports remain available.
            </p>
          )}
          <div className="commons-workbench" style={embedded ? undefined : { minHeight: "100vh" }}>
            <div className="commons-content">
              <section
                className="commons-start"
                aria-label="New task"
                hidden={activeView !== "compose"}
              >
                <h2>New task</h2>
                <p className="commons-meta">Describe a change, run agents, then review the PR before merging.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!target || (agentId && !agentReady)) return;
                    act(
                      "jobs",
                      {
                        repoId: target,
                        task,
                        ...(sourceMessageId ? { sourceMessageId } : {}),
                        ...(issueId ? { issueId } : {}),
                        ...(sourcePrId ? { sourcePrId } : {}),
                        ...(selectedAgent
                          ? {
                              agentId: selectedAgent.id,
                              agentVersion: selectedAgent.version,
                            }
                          : {}),
                      },
                      (next) => {
                        setSourceMessageId("");
                        setIssueId("");
                        setSourcePrId("");
                        showTask(next.jobs.at(-1).id);
                      },
                    );
                  }}
                >
                  {!repoId && (
                    <>
                      <label htmlFor="commons-project">Project</label>
                      <select
                        id="commons-project"
                        required
                        value={target}
                        onChange={(e) => {
                          setTarget(e.target.value);
                          setIssueId("");
                          setSourcePrId("");
                          setSourceMessageId("");
                        }}
                      >
                        <option value="" disabled>Select a project</option>
                        {data.projects.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.archived}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {current && <p className="commons-meta">Project: <strong>{current.name}</strong></p>}
                  <label htmlFor="commons-task">Task</label>
                  <textarea
                    id="commons-task"
                    ref={taskInput}
                    rows={3}
                    maxLength={1000}
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                  />
                  <label htmlFor="commons-agent">Agent</label>
                  <select
                    id="commons-agent"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="">Workspace Builder</option>
                    {agentId && !selectedAgent && (
                      <option value={agentId} disabled>
                        {savedAgents.loading ? "Loading selected saved agent" : "Selected saved agent unavailable"}
                      </option>
                    )}
                    {agents.map((agent) => (
                      <option value={agent.id} key={agent.id}>
                        {agent.name} · {agent.provider}/{agent.model}
                      </option>
                    ))}
                  </select>
                  {account.user && (
                    <div role="group" aria-label="Saved agents" aria-busy={savedAgents.loading}>
                      <button type="button" className="btn" disabled={savedAgents.loading}
                        onClick={(event) => savedAgents.refresh(event.currentTarget)}>
                        {savedAgents.loading ? "Refreshing saved agents" : "Refresh saved agents"}
                      </button>
                      <p role={savedAgents.error ? "alert" : "status"} className="commons-meta">
                        {savedAgents.loading ? "Reading saved configurations. No agent is started." : savedAgents.error
                          ? `${savedAgents.error}${savedAgents.known ? " Showing the last available configurations; refresh before using a saved author." : " Saved configurations are unknown."}`
                          : agents.length ? "Saved configurations loaded. Selection does not start an agent." : "No saved configurations in this account."}
                      </p>
                    </div>
                  )}
                  {agentId && !selectedAgent && !savedAgents.loading && !savedAgents.error && (
                    <p role="alert">
                      {account.user ? "The selected saved agent is unavailable in this account. Choose another author or sign in to its owner account." : "Sign in to the agent owner account to load the selected saved configuration."}
                    </p>
                  )}
                  {agentReady && (
                    <p className="commons-meta">
                      Uses configuration v{selectedAgent.version}. Its name,
                      instructions and allowed actions are retained with this
                      task in the local workspace. No provider charge; code is
                      parsed only.
                    </p>
                  )}
                  {linkedIssue && (
                    <p>
                      Issue #{linkedIssue.number}: {linkedIssue.title}{" "}
                      <button
                        type="button"
                        className="commons-text-button"
                        onClick={() => setIssueId("")}
                      >
                        Remove issue
                      </button>
                    </p>
                  )}
                  {sourcePrId && (
                    <p>
                      Revision of PR #
                      {allPulls.find((pr) => pr.id === sourcePrId)?.number}.
                      Previous code and review are included.{" "}
                      <button
                        type="button"
                        className="commons-text-button"
                        onClick={() => setSourcePrId("")}
                      >
                        Remove PR source
                      </button>
                    </p>
                  )}
                  {sourceMessage && (
                    <>
                      <SourceMessage event={sourceMessage} />
                      <button
                        type="button"
                        className="commons-text-button"
                        disabled={pending}
                        onClick={() => {
                          setSourceMessageId("");
                          taskInput.current?.focus({ preventScroll: true });
                        }}
                      >
                        Remove source
                      </button>
                    </>
                  )}
                  <div
                    className="commons-actions"
                    role="group"
                    aria-label="Model readiness"
                    aria-busy={checkingProvider}
                  >
                    <button
                      className="btn green"
                      disabled={
                        pending ||
                        Boolean(running) ||
                        checkingProvider ||
                        Boolean(provider?.busy) ||
                        provider?.available !== true ||
                        !task.trim() ||
                        !target ||
                        Boolean(current?.archived) ||
                        Boolean(agentId && !agentReady)
                      }
                    >
                      Run agents
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={checkingProvider || pending}
                      onClick={(event) => void checkProvider(undefined, event.currentTarget)}
                    >
                      {checkingProvider ? "Checking model" : "Check model"}
                    </button>
                    <span className="commons-meta" role="status">
                      {checkingProvider
                        ? "Checking local model."
                        : providerError
                          ? `Model status unavailable: ${providerError}`
                          : provider?.busy === true
                            ? "Local model is busy. Check again when it finishes."
                            : provider?.available === true
                            ? "Builder then Reviewer (2 calls max)"
                            : provider?.reason || "Model offline - npm run model:start"}
                    </span>
                  </div>
                </form>
              </section>
              {activeView === "projects" && (
                <Projects projects={data.projects} jobs={data.jobs} />
              )}
              {activeView === "issues" && current && (
                <Issues
                  project={current}
                  events={events}
                  jobs={allJobs}
                  pending={pending}
                  act={act}
                  onTask={(issue) => {
                    setIssueId(issue.id);
                    setSourceMessageId("");
                    setSourcePrId("");
                    setTarget(current.id);
                    setTask(`Investigate and resolve issue #${issue.number}: ${issue.title}`);
                    openComposer();
                  }}
                />
              )}
              {activeView === "code" && current && (
                <>
                  <CodeFiles
                    files={current.files}
                    label={`v${current.revision}`}
                  />
                  <div className="commons-actions">
                    <a
                      className="btn"
                      href={`/api/commons/projects/${encodeURIComponent(current.id)}/export?runId=${runId}`}
                      download
                    >
                      Export project
                    </a>
                    <a
                      className="btn"
                      href={`/api/commons/projects/${encodeURIComponent(current.id)}/git?runId=${runId}`}
                      download
                    >
                      Export Git history
                    </a>
                    <button
                      className="btn"
                      disabled={pending || Boolean(running)}
                      onClick={() =>
                        act("project-state", {
                          repoId,
                          archived: !current.archived,
                        })
                      }
                    >
                      {current.archived ? "Restore project" : "Archive project"}
                    </button>
                  </div>
                  {current.origin && (
                    <p className="commons-meta">
                      Forked from{" "}
                      <a href={path("commons", current.origin.repoId)}>
                        {current.origin.repoId}
                      </a>{" "}
                      at v{current.origin.revision}
                    </p>
                  )}
                </>
              )}
              {activeView === "forks" && current && (
                <Forks forks={current.forks} />
              )}
              {activeView === "versions" && current && (
                <Versions
                  history={history}
                  selected={selectedVersion}
                  onSelect={(revision) => showVersion(repoId, revision)}
                  onPull={showPull}
                />
              )}
              {activeView === "changes" && (
                <>
                  {!focusedPull && prs.length > 0 && (
                    <nav
                      className="commons-record-picker"
                      aria-label="Pull requests"
                    >
                      {prs.map((pr) => (
                        <button
                          className="btn"
                          key={pr.id}
                          onClick={() => showPull(pr.id)}
                          aria-pressed={pr.id === prs[0].id}
                        >
                          <strong>
                            #{pr.number} {pr.title}
                          </strong>
                          <span>
                            {pr.repoId} · {pr.status}
                          </span>
                        </button>
                      ))}
                    </nav>
                  )}
                  {focusedPull && (
                    <p className="commons-meta">
                      <a
                        href={`${path("commons", repoId)}?view=changes`}
                        onClick={(event) => {
                          event.preventDefault();
                          selectView("changes");
                        }}
                      >
                        All pull requests
                      </a>
                    </p>
                  )}
                  {focusedPull &&
                  !prs.some((pull) => pull.id === focusedPull) ? (
                    <p role="status">Pull request not found in this project.</p>
                  ) : (
                    <PullChanges
                      prs={
                        focusedPull
                          ? prs.filter((pull) => pull.id === focusedPull)
                          : prs.slice(0, 1)
                      }
                      pending={pending}
                      act={act}
                      focusedId={focusedPull}
                      onVersion={showVersion}
                      jobs={allJobs}
                      onTask={showTask}
                      events={events}
                      onRevise={revisePull}
                    />
                  )}
                </>
              )}
              {activeView === "tasks" && (
                <>
                  {selectedTask && (
                    <button
                      className="commons-text-button"
                      onClick={() => selectView("tasks")}
                    >
                      All tasks
                    </button>
                  )}
                  {workingTask?.pull && (
                    <PullChanges
                      prs={[workingTask.pull]}
                      pending={pending}
                      act={act}
                      onVersion={showVersion}
                      events={data.events}
                      onRevise={revisePull}
                    />
                  )}
                  <Tasks
                    jobs={jobs.filter(
                      (job) => !selectedTask || job.id === selectedTask,
                    )}
                    onPull={showPull}
                    onTimeline={showTaskTimeline}
                    onVersion={showVersion}
                    onOpen={showTask}
                    onCreate={current?.archived ? undefined : openComposer}
                    focused={Boolean(selectedTask)}
                  />
                  {selectedTask && !workingTask && (
                    <p role="status">Task not found in this project.</p>
                  )}
                </>
              )}
              {activeView === "activity" && (
                <>
                  {activeTask && (
                    <>
                      <div className="commons-actions">
                        <strong>Task #{activeTask.number}</strong>
                        <button
                          className="commons-text-button"
                          onClick={() => showTask(activeTask.id)}
                        >
                          View task
                        </button>
                        <button
                          className="commons-text-button"
                          onClick={() => setTimelineTask("")}
                        >
                          All activity
                        </button>
                      </div>
                      <SourceMessage event={activeTask.sourceMessage} />
                    </>
                  )}
                  {current && !embedded && !activeTask ? (
                    <LocalProjectTimeline
                      project={current}
                      jobs={data.jobs}
                      events={data.events}
                      offline={connectionError}
                      paused={paused}
                    />
                  ) : (
                    <Activity
                      events={activeTask ? activeTask.events : events}
                      pulls={allPulls}
                      onPull={showPull}
                      onVersion={showVersion}
                    />
                  )}
                </>
              )}
              {activeView === "discussion" && (
                <section className="commons-chat" aria-label="Chat">
                  {messages.length > 40 && (
                    <div className="commons-history-controls">
                      <span className="small muted" role="status">
                        Showing {visibleMessages.length} of {messages.length} saved messages
                      </span>
                      {messageStart > 0 && (
                        <button className="commons-text-button" onClick={(event) => {
                          const log = chatLog.current;
                          messageAnchor.current = {
                            top: log.scrollTop, height: log.scrollHeight,
                            viewportTop: log.getBoundingClientRect().top,
                            trigger: document.activeElement === event.currentTarget ? event.currentTarget : null,
                          };
                          followChat.current = false;
                          setMessageWindowStart(messages[Math.max(0, messageStart - 40)].id);
                        }}>
                          Show {Math.min(40, messageStart)} earlier messages
                        </button>
                      )}
                    </div>
                  )}
                  <div
                    className="commons-messages"
                    role="region"
                    tabIndex={0}
                    aria-label="Saved messages"
                    ref={chatLog}
                    onScroll={(event) => {
                      const log = event.currentTarget;
                      chatPosition.current = log.scrollTop;
                      followChat.current =
                        log.scrollHeight - log.scrollTop - log.clientHeight <
                        48;
                      if (!followChat.current && messageWindowStart === null && visibleMessages.length)
                        setMessageWindowStart(visibleMessages[0].id);
                    }}
                  >
                    {!messages.length && (
                      <p className="commons-empty">No messages yet.</p>
                    )}
                    {visibleMessages.map((event) => (
                      <article key={event.id} className="commons-message">
                        <div className="commons-byline">
                          <strong>
                            {event.actorName || actorNames[event.actor]}
                          </strong>
                          <span>{event.inference ? "Model" : "Operator"}</span>
                          <RecordedTime at={event.at} />
                        </div>
                        <p>{event.text}</p>
                        <div className="commons-actions">
                          <button
                            className="commons-text-button"
                            disabled={pending}
                            onClick={() => {
                              setSourceMessageId(event.id);
                              setIssueId("");
                              setSourcePrId("");
                              if (!repoId && event.projectId)
                                setTarget(event.projectId);
                              openComposer();
                            }}
                          >
                            Create task
                          </button>
                          {allJobs.some((job) => job.id === event.jobId) && (
                            <button
                              className="commons-text-button"
                              onClick={() => showTask(event.jobId)}
                            >
                              Task #
                              {
                                allJobs.find((job) => job.id === event.jobId)
                                  .number
                              }
                            </button>
                          )}
                          {event.prId && (
                            <button
                              className="commons-text-button"
                              onClick={() => showPull(event.prId)}
                            >
                              PR #
                              {
                                allPulls.find((p) => p.id === event.prId)
                                  ?.number
                              }
                            </button>
                          )}
                          {allJobs
                            .filter((job) => job.sourceMessageId === event.id)
                            .map((job) => (
                              <button
                                key={job.id}
                                className="commons-text-button"
                                onClick={() => showTask(job.id)}
                              >
                                Task #{job.number}
                              </button>
                            ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  <form
                    className="commons-compose"
                    aria-label="Send message"
                    aria-busy={pending && actionEndpoint === "messages"}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (pending || !draft.trim()) return;
                      const submittedRevision = messageRevision.current;
                      setMessageSent(false);
                      act("messages", { repoId, message: draft }, () => {
                        if (messageRevision.current === submittedRevision) setDraft("");
                        setMessageSent(true);
                      });
                    }}
                  >
                    <label htmlFor="commons-message">Message</label>
                    <textarea
                      id="commons-message"
                      value={draft}
                      onChange={(e) => {
                        messageRevision.current++;
                        setMessageSent(false);
                        setDraft(e.target.value);
                      }}
                      aria-describedby={error && actionEndpoint === "messages" ? "commons-message-error" : undefined}
                      maxLength={2000}
                      rows={3}
                      placeholder="Write a message…"
                    />
                    {error && actionEndpoint === "messages" && (
                      <p id="commons-message-error" className="inline-error" role="alert">{error}</p>
                    )}
                    <div>
                      <span className="commons-meta" role="status">
                        {pending && actionEndpoint === "messages" ? "Sending message…" : messageSent ? "Message sent · Local operator" : "Local operator"}
                      </span>
                      <button
                        className="btn"
                        disabled={pending || !draft.trim()}
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </section>
              )}
              {current && !embedded && activeView === "code" && (
                <LocalProjectTimeline
                  project={current}
                  jobs={data.jobs}
                  events={data.events}
                  offline={connectionError}
                  paused={paused}
                />
              )}
            </div>
            <aside
              className="commons-support"
              aria-label="Project actions and contributors"
            >
              {workingProject && (
                <LocalProjectTimeline
                  key={workingTask.id}
                  project={workingProject}
                  jobs={data.jobs}
                  events={data.events}
                  taskId={workingTask.id}
                  offline={connectionError}
                  paused={paused}
                />
              )}
              {activeView === "projects" && (
                <ProjectForm pending={pending} act={act} addressRef={projectInput} />
              )}
              {activeView === "forks" && current && (
                <ProjectForm source={current} pending={pending} act={act} />
              )}
              {current && !embedded && (
                <ProjectContributions project={current} jobs={data.jobs} />
              )}
              <div className="commons-footnotes">
                <section className="commons-execution">
                  <h2>Execution</h2>
                  <p>
                    Builder and Reviewer share a local model. Syntax checks do
                    not run the code. Merges update this local copy only. Local
                    operator is not an authenticated account.
                  </p>
                  {current && !current.createdAt && (
                    <a href={path("repo", repoId)}>Original scenario</a>
                  )}
                </section>
                <a
                  className="commons-export"
                  href={`/api/commons?runId=${runId}`}
                  download={`commons-${runId}.json`}
                >
                  Export
                </a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
