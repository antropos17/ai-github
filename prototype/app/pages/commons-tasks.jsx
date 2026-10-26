import React from "react";
import { path } from "../router.mjs";
import { RecordedTime, SourceMessage } from "./commons-panels.jsx";

export function Tasks({
  jobs,
  onPull,
  onTimeline,
  onVersion,
  onOpen,
  onCreate,
  focused,
}) {
  if (!jobs.length) {
    if (focused) return null;
    return (
      <div className="commons-empty">
        <p>
          No tasks yet. Tasks keep agent responses, proposed changes and review
          results together.
        </p>
        {onCreate && (
          <button className="btn" onClick={onCreate}>
            Create first task
          </button>
        )}
      </div>
    );
  }
  return (
    <ol className="commons-tasks" aria-label="Saved tasks">
      {jobs.map((job) => {
        const nextAction =
          job.status === "running" || !job.pull
            ? "timeline"
            : job.pull.status === "merged"
              ? "version"
              : "pull";
        const nextStep = {
          approved: "Review the proposed change before merging.",
          "changes-requested":
            "Read the review before creating a revision task.",
          closed:
            "Open the pull request to reopen it or create a revision task.",
        }[job.pull?.status];
        return (
          <li key={job.id}>
            <div className="commons-byline">
              <h2>Task #{job.number}</h2>
              <a href={path("commons", job.repoId)}>{job.repoId}</a>
              <span>{job.phase}</span>
            </div>
            <p className="commons-task-text">{job.task}</p>
            <p className="commons-task-text">
              <strong>
                {job.status === "running" && !job.pull
                  ? "No pull request yet"
                  : job.outcome}
              </strong>
              {nextStep && <>. {nextStep}</>}
            </p>
            <div className="commons-actions">
              {job.pull && (
                <button
                  className={
                    nextAction === "pull" ? "btn" : "commons-text-button"
                  }
                  onClick={() => onPull(job.pull.id)}
                >
                  {job.pull.status === "approved" || job.pull.status === "open"
                    ? "Review"
                    : "View"}{" "}
                  PR #{job.pull.number}
                </button>
              )}
              {job.pull?.status === "merged" && (
                <button
                  className="btn"
                  onClick={() =>
                    onVersion(job.repoId, job.pull.baseRevision + 1)
                  }
                >
                  View v{job.pull.baseRevision + 1}
                </button>
              )}
              <button
                className={
                  nextAction === "timeline" ? "btn" : "commons-text-button"
                }
                onClick={() => onTimeline(job.id)}
              >
                Task #{job.number} timeline
              </button>
              {!focused && (
                <button
                  className="commons-text-button"
                  onClick={() => onOpen(job.id)}
                >
                  Open task #{job.number}
                </button>
              )}
            </div>
            {job.issue && (
              <p>
                <a href={`${path("commons", job.repoId)}?view=issues`}>
                  Issue #{job.issue.number}: {job.issue.title}
                </a>{" "}
                · {job.issue.status}
              </p>
            )}
            {job.agent && (
              <p className="commons-meta">
                {job.agent.name} · configuration v{job.agent.version} ·{" "}
                {job.agent.maxMinutes} minutes max · permissions:{" "}
                {job.agent.capabilities.join(", ")}
              </p>
            )}
            <SourceMessage event={job.sourceMessage} />
            {job.fork && (
              <p className="commons-meta">
                Fork <code>{job.fork.id.slice(0, 8)}</code> · base v
                {job.fork.baseRevision} · {Object.keys(job.fork.files).length}{" "}
                files retained
              </p>
            )}
            {job.sourcePull && (
              <button
                className="commons-text-button"
                onClick={() => onPull(job.sourcePull.id)}
              >
                Revision of PR #{job.sourcePull.number}
              </button>
            )}
            <div className="commons-byline">
              <span>
                Started <RecordedTime at={job.startedAt} />
              </span>
              {job.finishedAt && (
                <span>
                  Finished <RecordedTime at={job.finishedAt} />
                </span>
              )}
            </div>
            <p className="commons-meta">
              {job.model} · {job.provenance} · {job.responseCount} recorded
              responses
            </p>
            {job.reason && <p className="commons-task-text">{job.reason}</p>}
          </li>
        );
      })}
    </ol>
  );
}
