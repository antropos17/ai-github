export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export async function request(path, body) {
  let response;
  try {
    response = await fetch("/api/" + path, {
      method: body ? "POST" : "GET",
      headers: body
        ? { "Content-Type": "application/json", "X-Commit-Zero": "local-demo" }
        : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ApiError(
      "Нет связи с сервером. Проверьте, запущен ли сайт, и повторите попытку.",
      0,
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 409
        ? "Другой наблюдатель уже изменил сценарий. Данные обновлены — попробуйте ещё раз."
        : "Сервер не смог сохранить изменение. Повторите попытку.",
      response.status,
    );
  return response.json();
}
export const api = {
  load: () => request("state"),
  advance: (state) =>
    request("advance", { runId: state.runId, version: state.version }),
  newRun: (state) =>
    request("runs", { runId: state.runId, version: state.version }),
};
