# @napplet/archetypes-indexer

The data side of [archetypes.napplet.run](https://archetypes.napplet.run). One long-running Node service finds relays, crawls them for napplet manifests, keeps the signed events in SQLite, and once a day builds the [archetypes site](../archetypes) from that store and uploads it to Bunny Storage.

It reads and stores events. It never publishes to relays and adds no protocol surface: manifests are NIP-5D kinds 5129, 15129 and 35129 ([nostr-protocol/nips#2303](https://github.com/nostr-protocol/nips/pull/2303)), and relay discovery uses NIP-66 kind 30166 events.

## How it works

1. **Discover.** Every `discovery.intervalHours`, it asks the NIP-66 monitor relays for recent kind 30166 events. Each event's `d` tag names a relay. URLs are normalised (lower-case host, no default port, no trailing slash) and de-duplicated. Configured seed relays are always tracked.
2. **Crawl.** Each tick crawls the relays that are due, highest score first, `crawl.concurrency` at a time. It pages backwards with `until`, verifies every signature, and stores manifests with a record of which relay served them. Relays that have served napplets are crawled incrementally from their last good crawl.
3. **Score.** A relay's points are the distinct napplet manifests it has served times `pointsPerNapplet`. A relay with points stays on the daily cadence. A reachable relay with zero points backs off along `backoffHours`: 1 day, 3 days, 7 days, 2 weeks, then 1 month. A relay that refuses connections `offlineAfterFailures` times in a row is removed. It comes back only if a monitor reports it again after the removal. Seed relays are never removed; they back off instead.
4. **Build.** At `build.at` (UTC) each day, it writes `snapshot.json` (all stored events, relay hints, the scored relay table, and the relays browsers should use for live top-up: the `runtimeTopRelays` best-scored plus `runtimePinnedRelays`) and runs `astro build` in the site package, into its own `dist/` (Astro moves files with `rename`, which cannot cross onto a mounted data volume).
5. **Deploy.** When Bunny is configured, it uploads changed files (assets before pages), deletes files the build no longer has, and purges the pull zone. Unchanged files are skipped by SHA-256 checksum.

## Run it

Node 24 runs the TypeScript sources directly.

```bash
pnpm install
pnpm --filter @napplet/archetypes-indexer start     # forever
pnpm --filter @napplet/archetypes-indexer once      # one tick, then exit
node apps/archetypes-indexer/src/main.ts --build    # export, build and deploy now
```

Or with Docker, from the repository root:

```bash
docker build -f apps/archetypes-indexer/Dockerfile -t archetypes-indexer .
docker run -v archetypes-data:/data -e BUNNY_STORAGE_ZONE=… -e BUNNY_STORAGE_PASSWORD=… archetypes-indexer
```

[`compose.yaml`](compose.yaml) runs the same image with a named data volume. Its build context defaults to the repository root as seen from this directory (`../..`); a deployment tool that runs compose with `--project-directory` at the repository root should set `ARCHETYPES_BUILD_CONTEXT=.` at build time. The container listens on port 8080: `/healthz` returns 200 while ticks keep finishing, and `/status` reports counts, timings and the top-scored relays.

## Configure

Every setting is optional; the defaults are a complete deployment. [`archetypes.example.yaml`](archetypes.example.yaml) lists every key with its default and what it does. Supply overrides in one of two ways:

| Variable | Meaning |
| --- | --- |
| `ARCHETYPES_YAML` | YAML text; wins over the file |
| `ARCHETYPES_CONFIG` | Path to a YAML file (the image looks at `/config/archetypes.yaml`) |
| `ARCHETYPES_DATA_DIR` | Data directory (the image uses `/data`) |
| `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ENDPOINT`, `BUNNY_PULLZONE_ID` | Bunny identifiers; override the file |
| `BUNNY_STORAGE_PASSWORD` | Storage zone password. Without it nothing is deployed. |
| `BUNNY_API_KEY` | Account API key, used only to purge the pull zone |

Unknown keys and wrong types are rejected at start-up rather than ignored.

## Data

`<dataDir>/archetypes.sqlite` holds `events` (each signed manifest as received), `sightings` (event × relay), `relays` (scores and schedule) and `meta`. Back up the volume to keep crawl history; deleting it only costs a fresh crawl.

## Test

```bash
pnpm --filter @napplet/archetypes-indexer test:unit
pnpm --filter @napplet/archetypes-indexer type-check
```

Tests run real WebSocket relays on loopback, an in-memory store and a fake Bunny API.
