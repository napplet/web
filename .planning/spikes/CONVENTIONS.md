# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the question requires otherwise.

## Stack

Use the repository's Node, Vite, and TypeScript/JavaScript toolchain for build-plugin spikes, and use the existing Deno test suite when the proof crosses into `@napplet/cli` signer or deployment behavior.

## Structure

Build generated high-volume fixtures under a temporary directory inside the spike directory, remove them in `finally`, and keep a small tracked HTML report with the measured evidence.

## Patterns

Protocol-adjacent feasibility claims require both a runnable experiment and citations to the current living NIP/NAP source. Embedded spike or plugin metadata must remain explicitly non-normative and must not create a new shell/runtime requirement.

## Tools & Libraries

Use Vite's programmatic `build()` for bundle-shape proof and `nostr-tools` for real event signing and signature verification. Reuse the repository's existing NIP-46 and Blossom test suites rather than creating a second signer implementation inside a spike.
