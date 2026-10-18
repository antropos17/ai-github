const key = "commit-zero-theme";
const control = document.querySelector("#theme-select");
const valid = (value) => value === "light" || value === "dark";
const systemTheme = () =>
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  control.value = theme;
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#010409" : "#f6f8fa";
  document
    .querySelector("#preview-frame")
    .contentWindow?.postMessage({ type: "commit-zero-theme", theme }, "*");
}

let initial = document.documentElement.dataset.theme || systemTheme();
try {
  const saved = localStorage.getItem(key);
  if (valid(saved)) initial = saved;
} catch {
  /* Storage may be unavailable; the selector still works. */
}
apply(initial);
control.addEventListener("change", () => {
  if (!valid(control.value)) return;
  apply(control.value);
  try {
    localStorage.setItem(key, control.value);
  } catch {
    /* Session-only preference. */
  }
});
window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === null)
    apply(valid(event.newValue) ? event.newValue : systemTheme());
});
