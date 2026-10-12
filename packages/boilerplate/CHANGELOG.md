# @napplet/boilerplate

## 0.4.0

### Minor Changes

- Run standalone CLI commands without installed host runtimes, package managers, Git, Kehto, browser tooling, or keychain utilities. Browser and Paja commands provision private cached tooling automatically; screenshots and conformance share it. Linux browser packs include libraries and fonts for x64 and ARM64. Hosts without native keychains use password-encrypted local storage.

  Remote scaffolding downloads GitHub or HTTP(S) ZIP templates without Git. Other Git transports now require a local directory or archive URL. The exported CLI `resolveConformanceCommand` helper is asynchronous because it may provision private tooling.

## 0.3.4

### Patch Changes

- 2910c4b: Correct the shipped setup guide to use `napplet:note/open` directly with `napplet init --archetype` and describe its separate role and intent advertisements.

## 0.3.3

### Patch Changes

- 976ad05: Remove the `napplet skills` subcommand and the bundled `@napplet/skills` installer. Agent skills now live in the repository's `skills/` directory as `napplet-*` skills and install with the open skills.sh CLI: `npx skills add napplet/napplet`. `napplet guide`, `napplet init` output, and the `napplet create` next-steps point at that command.

## 0.3.2

### Patch Changes

- b17e944: Make standalone release binaries dispatch bundled create and skills package code without a runtime Node.js or package-resolver dependency, preserve the JSR CLI's package-runner compatibility API, and expose import-safe callable CLI entry points from the maintained packages.

## 0.3.1

### Patch Changes

- dd7b3a7: Update shipped generator, conformance CLI, and agent-skill guidance for
  queryless convention identities, optional same-tag event kinds, authoritative
  intent URIs, acceptance-before-delivery, runtime-attested sender, and
  carrier-neutral delivery without a public NAP-INC dependency.

## 0.3.0

### Minor Changes

- 49a8658: Make developer onboarding CLI-first from installation through deployment. The
  Napplet CLI now creates starters, owns deployment metadata, installs agent
  skills, prints a linked developer guide, and ships as checksum-verified
  standalone binaries. The boilerplate
  generator no longer prompts for deployment metadata, and the bundled skills
  teach the same ordered workflow as the CLI, docs, and web app.

## 0.2.1

### Patch Changes

- d6291de: Point generated projects to the current skills, remove undocumented build-time config guidance, and keep hard `count` requirements from being dropped by the Vite plugin.

## 0.2.0

### Minor Changes

- 110a346: Add an interactive generator package for creating napplets from the
  github.com/napplet/boilerplate template.
