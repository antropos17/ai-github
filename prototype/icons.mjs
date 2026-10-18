import repo from "./assets/icons/repo-16.svg?raw";
import star from "./assets/icons/star-16.svg?raw";
import fork from "./assets/icons/repo-forked-16.svg?raw";
import pr from "./assets/icons/git-pull-request-16.svg?raw";
import file from "./assets/icons/file-16.svg?raw";
import code from "./assets/icons/code-16.svg?raw";
import check from "./assets/icons/check-16.svg?raw";

const icons = { repo, star, fork, pr, file, code, check };

export const icon = (name) =>
  (icons[name] || icons.repo).replace(
    "<svg ",
    '<svg class="icon" aria-hidden="true" fill="currentColor" ',
  );
