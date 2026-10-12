---
quick_id: 261011-hdg
status: in-progress
---

# Standalone CLI without host tooling

Goal: users can download the CLI and run every built-in command without installing runtimes, package managers, Git, Kehto, browser tooling, or keychain utilities. Custom commands supplied by users remain their responsibility.

1. Audit all subprocess paths. Provision pinned private tooling from verified downloads using in-process archive extraction, and route screenshots/conformance through it without host npx resolution. Preserve maintained package behavior and diagnostic routing.
2. Remove Git from default remote template creation. Provide default Paja tooling automatically. Provide secure portable key storage when a native keychain is unavailable.
3. Add meaningful unit and compiled-binary integration coverage with a restricted PATH and fresh cache. Exercise screenshots, deploy capture, conformance, create, Paja, and key commands; verify other commands already use embedded code.
4. Update CLI and website docs, release metadata, run repository build/type/unit/slop gates, commit explicit paths, push and open a PR. Record verification evidence and remaining limitations honestly.

No protocol or conformance requirement changes are authorized by this task.
