# One-Shot Napplet Implementation Benchmark

You are an autonomous coding agent. Make one implementation attempt for the
scenario below, then stop for scoring. Use the napplet repo's current skills,
docs, boilerplate, and package APIs when they are available in your environment.
Do not edit benchmark checks or weaken the task.

## Scenario

Build a small napplet named Latest Note. It should read the latest kind 1 note through the shell-owned OUTBOX boundary, show a clear fallback when the outbox domain is unavailable, avoid direct relay sockets and app-owned signing, and keep build plus conformance verification available through package scripts.

## Required Evidence In The Candidate

- A complete napplet project with package scripts for build, conformance, and
  verification.
- Source code that implements the scenario through shell-owned napplet domains.
- A README that names the produced napplet and how to verify it.

The benchmark harness will score the candidate directory produced by this
single run.
