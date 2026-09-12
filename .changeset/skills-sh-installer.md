---
"@napplet/cli": minor
"@napplet/boilerplate": patch
---

Remove the `napplet skills` subcommand and the bundled `@napplet/skills` installer. Agent skills now live in the repository's `skills/` directory as `napplet-*` skills and install with the open skills.sh CLI: `npx skills add napplet/napplet`. `napplet guide`, `napplet init` output, and the `napplet create` next-steps point at that command.
