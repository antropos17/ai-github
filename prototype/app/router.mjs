import { useSyncExternalStore } from "react";
let current = location.hash || "#/home";
let previous = current;
const listeners = new Set();
export const routeScroll = import.meta.hot?.data.routeScroll || new Map();
export const routeGroup = (value) => value.split("/").slice(0, 3).join("/");
window.history.scrollRestoration = "manual";
const onHashChange = () => {
  routeScroll.set(current, window.scrollY);
  previous = current;
  current = location.hash || "#/home";
  for (const listener of listeners) listener();
};
window.addEventListener("hashchange", onHashChange);
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.routeScroll = routeScroll;
    window.removeEventListener("hashchange", onHashChange);
  });
export const previousRoute = () => previous;
export function useRoute() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
export function parseRoute(raw) {
  const [pathname, query = ""] = raw.slice(1).split("?");
  try {
    return {
      segments: pathname.split("/").filter(Boolean).map(decodeURIComponent),
      query: new URLSearchParams(query),
    };
  } catch {
    return { segments: ["missing"], query: new URLSearchParams() };
  }
}
export const path = (kind, id, tab) =>
  `#/${kind}${id ? "/" + encodeURIComponent(id) : ""}${tab ? "/" + tab : ""}`;
