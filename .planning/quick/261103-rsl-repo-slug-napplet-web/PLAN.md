# Quick 261103-rsl: point repository references at napplet/web

The repository moved from `napplet/napplet` to `napplet/web`. GitHub redirects the old slug, but the docs (for example https://napplet.run/docs/guide/agent-skills.html), READMEs, skills, the CLI and boilerplate guidance, installer release URLs and package `repository` fields still print the old name.

- Replace every `napplet/napplet` with `napplet/web`, outside CHANGELOGs and `.planning/` history.
- Update the tests that assert the old string.
- Changeset: patch for `@napplet/boilerplate` and `@napplet/cli`, whose shipped output prints the slug.
