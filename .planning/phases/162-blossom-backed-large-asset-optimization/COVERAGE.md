# Phase 162 Coverage Contract

**Status:** Planning input
**Protocol posture:** This is a non-normative implementation coverage index. The living sources linked below remain authoritative; this file does not define a NIP, NAP, BUD, manifest field, message, or conformance requirement.

## Requirement and Probe Status

- ROADMAP assigns no phase requirement IDs (`Requirements: TBD`), so plan frontmatter uses `requirements: []` and does not invent IDs.
- The spec-less fallback probe was visibly skipped because there are no requirement IDs to probe. No probe-derived predicates were generated.
- Plan must-haves instead lift the complete CONTEXT decisions, canonical prohibitions, validation rows, and user acceptance evidence below.

## Decision Ledger

The source CONTEXT has no numbered decision labels, so this phase-local ledger assigns planning-only trace IDs without changing the decisions or creating protocol identifiers.

| ID | Locked decision | Planned coverage |
|----|-----------------|------------------|
| D-01 | Measure the would-be `/index.html`; activate only when bytes are greater than exactly `2 * 1024 * 1024`. | 162-01, 162-07, 162-09 |
| D-02 | Preserve emitted asset boundaries and sort eligible blobs by bytes descending with an emitted-identity ascending tie-break. | 162-01, 162-07 |
| D-03 | Re-render after each selection and stop once final HTML including private metadata is below the target. | 162-01, 162-07, 162-09 |
| D-04 | Exhaustion above target is successful and visibly reported; the threshold is not conformance or a build hard error. | 162-01, 162-07, 162-09 |
| D-05 | Pair through terminal `nostrconnect://` QR with the existing pasted `bunker://` race. | 162-03, 162-04, 162-08, 162-09 |
| D-06 | Request only NIP-46 public-key access and signing scoped to Blossom authorization kind `24242`. | 162-02, 162-04, 162-09 |
| D-07 | Persist/reuse `nbunksec` through protected platform stores while keeping it, the client private key, and signer secrets out of artifacts, logs, cache, and config. | 162-03, 162-04, 162-08, 162-09, 162-11 |
| D-08 | Extract/reuse tested CLI signer and key-store behavior rather than reimplementing NIP-46 in Vite. | 162-02, 162-03, 162-04 |
| D-09 | Query a bounded directory set including `wss://purplepag.es` for the signer-authored replaceable kind `10002`. | 162-05, 162-06, 162-08, 162-09 |
| D-10 | Verify events and select newest kind `10002` by `created_at` with a deterministic tie-break. | 162-05, 162-06, 162-08, 162-09 |
| D-11 | Query write/unmarked relays from kind `10002` for signer-authored kind `10063`, select newest valid, and preserve normalized/deduplicated `server` tag order. | 162-05, 162-06, 162-08, 162-09 |
| D-12 | Never treat kind `10002` relay tags as Blossom servers. | 162-05, 162-06, 162-09 |
| D-13 | If no valid user server list remains, use a deliberate visible fallback/error path and never impersonate an unrelated server as user preference. | 162-05, 162-06, 162-09 |
| D-14 | Hash and upload exact emitted bytes using the existing BUD authorization/upload compatibility behavior. | 162-01, 162-05, 162-06, 162-09 |
| D-15 | Emit selected references only as `blossom:sha256:<64 lowercase hex>` from the published NAP-RESOURCE proposal. | 162-01, 162-05, 162-09 |
| D-16 | Embed deterministic private JSON mapping emitted identity to URI, hash, bytes, and MIME. | 162-01, 162-09 |
| D-17 | Present the mapping only as tool-owned signed-artifact plumbing, never as a NIP-5A/NIP-5D/NAP field, message, handshake, or conformance rule. | 162-01, 162-09 |
| D-18 | Remove emitted files only after required uploads succeed on at least one selected server and final references/hashes verify. | 162-01, 162-09 |
| D-19 | Resolve browser resources through existing `window.napplet.resource.bytes`/`bytesMany`, never raw network or a new protocol message. | 162-01, 162-07, 162-09 |
| D-20 | Automatically replace only explicitly supported game-oriented consumers; preserve/skip other reference shapes and document them. | 162-07, 162-09, 162-10 |
| D-21 | Retain runtime hash verification at the NAP-RESOURCE boundary. | 162-01, 162-07, 162-09 |
| D-22 | Generate a deterministic fixture totaling at least 50 MiB without committing large binaries. | 162-10 |
| D-23 | Demonstrate measured input, selection order, final size, metadata, authenticated upload, replacements, and byte-identical recovery. | 162-10, 162-11 |
| D-24 | Update package docs and changesets for every changed shipped package. | 162-10, 162-11 |
| D-25 | Run full repository gates, commit atomically, push the branch, and open a PR. | 162-11 |
| D-26 | Choose a clear public option/type while preserving automatic exact-threshold behavior. | 162-09 |
| D-27 | Use the smallest cross-runtime extraction that avoids package cycles and Deno-only imports in Vite. | 162-02, 162-03, 162-04, 162-08 |
| D-28 | Choose a deterministic private JSON/loader shape that never impersonates protocol surface. | 162-01, 162-09 |
| D-29 | Choose bounded concurrency, retry, timeout, and secondary-server behavior while remaining fail-closed before local file deletion. | 162-05, 162-06, 162-07, 162-08, 162-09 |

## External API Capability Matrix

The matrix defaults relevant capabilities to `INTEGRATE`. `OPT-OUT` rows are explicit non-requirements for this phase; they must not be implemented indirectly or converted into local protocol rules.

The fenced matrix is the machine-readable gate contract; the domain tables below provide human-readable rationale and canonical links.

```coverage
[
  {"capability":"NIP-46 nostrconnect client pairing","decision":"INTEGRATE","reason":"Display terminal QR and race it with pasted signer input."},
  {"capability":"NIP-46 bunker signer pairing","decision":"INTEGRATE","reason":"Preserve the existing pasted bunker fallback."},
  {"capability":"NIP-46 connect","decision":"INTEGRATE","reason":"Request only public-key and kind-24242 signing authority."},
  {"capability":"NIP-46 get_public_key","decision":"INTEGRATE","reason":"Bind discovery events and signer identity to the user."},
  {"capability":"NIP-46 sign_event kind 24242","decision":"INTEGRATE","reason":"Sign short-lived hash and server scoped upload authorization."},
  {"capability":"NIP-46 kind 24133 encrypted transport","decision":"INTEGRATE","reason":"Reuse the tested request and response transport."},
  {"capability":"NIP-46 ping","decision":"OPT-OUT","reason":"Reconnect plus get_public_key supplies required liveness."},
  {"capability":"NIP-46 crypto RPC methods","decision":"OPT-OUT","reason":"The build requires signing only and must not request other cryptographic authority."},
  {"capability":"NIP-46 explicit switch_relays command","decision":"OPT-OUT","reason":"The optimizer exposes no independent signer relay control."},
  {"capability":"NIP-46 logout","decision":"OPT-OUT","reason":"Remote account management is outside build optimization."},
  {"capability":"NIP-65 kind 10002 query","decision":"INTEGRATE","reason":"Discover the user's verified write and unmarked relays."},
  {"capability":"NIP-65 relay markers","decision":"INTEGRATE","reason":"Exclude read-only relays from authored kind-10063 retrieval."},
  {"capability":"Blossom kind 10063 query","decision":"INTEGRATE","reason":"Read the newest verified ordered user server list."},
  {"capability":"Publish kind 10002 or 10063","decision":"OPT-OUT","reason":"The build consumes and never mutates user relay preferences."},
  {"capability":"Use kind-10002 relays as Blossom servers","decision":"OPT-OUT","reason":"Relay metadata and Blossom server preferences are distinct."},
  {"capability":"BUD-00 SHA-256 blob identity","decision":"INTEGRATE","reason":"Bind exact emitted bytes across hash, upload, descriptor, and recovery."},
  {"capability":"BUD-01 HEAD blob existence","decision":"INTEGRATE","reason":"Check content-addressed existence with redirect validation."},
  {"capability":"BUD-01 GET blob retrieval","decision":"INTEGRATE","reason":"Use it only through the existing NAP-RESOURCE runtime boundary."},
  {"capability":"BUD-02 PUT upload","decision":"INTEGRATE","reason":"Upload exact emitted bytes and accept only a matching descriptor."},
  {"capability":"BUD-02 blob descriptor","decision":"INTEGRATE","reason":"Validate URL, digest, size, MIME type, and timestamp fields."},
  {"capability":"BUD-03 ordered server list","decision":"INTEGRATE","reason":"Preserve normalized first occurrence and primary order."},
  {"capability":"BUD-04 mirror","decision":"OPT-OUT","reason":"Direct exact-byte secondary uploads avoid remote-fetch ambiguity."},
  {"capability":"BUD-05 media transforms","decision":"OPT-OUT","reason":"Transforms change bytes and conflict with emitted-byte identity."},
  {"capability":"BUD-06 upload preflight","decision":"OPT-OUT","reason":"Optional preflight is unnecessary before authoritative upload."},
  {"capability":"BUD-07 payment negotiation","decision":"OPT-OUT","reason":"The build cannot settle invoices and preserves local output on 402."},
  {"capability":"BUD-08 NIP-94 tags","decision":"OPT-OUT","reason":"Optional social metadata is unrelated to private artifact mapping."},
  {"capability":"BUD-09 abuse reports","decision":"OPT-OUT","reason":"Abuse reporting is unrelated to build publication."},
  {"capability":"BUD-10 URI grammar","decision":"OPT-OUT","reason":"NAP-RESOURCE defines the different canonical artifact URI used here."},
  {"capability":"BUD-11 upload authorization","decision":"INTEGRATE","reason":"Use verified short-lived action, hash, and server scoped tokens."},
  {"capability":"BUD-11 non-upload authorization","decision":"OPT-OUT","reason":"No download, mirror, media, list, or delete authority is needed."},
  {"capability":"BUD-12 blob listing","decision":"OPT-OUT","reason":"Listing is unnecessary for content-addressed publication."},
  {"capability":"BUD-12 blob deletion","decision":"OPT-OUT","reason":"Remote destructive lifecycle requires separate explicit user intent."},
  {"capability":"NAP-RESOURCE blossom URI","decision":"INTEGRATE","reason":"Emit only blossom:sha256 with a lowercase digest."},
  {"capability":"NAP-RESOURCE resource.bytes","decision":"INTEGRATE","reason":"Recover lazy singular whole-Blob consumers."},
  {"capability":"NAP-RESOURCE resource.bytesMany","decision":"INTEGRATE","reason":"Recover bounded deterministic whole-Blob groups."},
  {"capability":"NAP-RESOURCE runtime integrity check","decision":"INTEGRATE","reason":"Reject returned bytes that do not match signed private metadata."},
  {"capability":"NAP-RESOURCE whole-Blob delivery","decision":"INTEGRATE","reason":"Bound each selected asset and supported consumer accordingly."},
  {"capability":"NAP-RESOURCE stream range or progress","decision":"OPT-OUT","reason":"Those operations are not defined by the accepted proposal."},
  {"capability":"New loader protocol surface","decision":"OPT-OUT","reason":"Mapping and loader code remain private signed-artifact plumbing."}
]
```

### NIP-46 Remote Signer

Canonical source: [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md).

| Published capability | Decision | Phase behavior / reason |
|----------------------|----------|-------------------------|
| Client-initiated `nostrconnect://` connection | INTEGRATE | Generate an ephemeral client key, show a terminal QR, validate the connect secret, and clean up losing relay/input tasks. |
| Remote-signer-initiated `bunker://` connection | INTEGRATE | Accept the existing pasted fallback and race it against the QR flow. |
| `connect` | INTEGRATE | Request only the permissions needed by this build path and validate the response. |
| `get_public_key` | INTEGRATE | Obtain the user pubkey used to validate kind `10002`/`10063` authorship. |
| `sign_event` for kind `24242` | INTEGRATE | Sign short-lived per-server, per-hash Blossom authorization events. |
| Request/response kind `24133`, NIP-44 transport, relay switch indicated by signer | INTEGRATE | Reuse the tested signer implementation and honor signer-selected session relays within bounds. |
| `ping` | OPT-OUT | Reconnect plus `get_public_key` is the liveness path needed here; an extra keepalive command adds no build capability. |
| `nip04_encrypt`, `nip04_decrypt`, `nip44_encrypt`, `nip44_decrypt` as application RPC commands | OPT-OUT | The optimizer signs upload authorization only and must not request unrelated cryptographic authority. |
| `switch_relays` as an explicit client command | OPT-OUT | Session relay changes are handled by the reused signer library; the optimizer exposes no independent relay-control UI. |
| `logout` RPC | OPT-OUT | This phase persists/replaces/deletes the local session record but does not add a user-facing remote-signer account-management command. |

### Nostr Relay Discovery

Canonical sources: [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) and [NIP-B7](https://github.com/nostr-protocol/nips/blob/master/B7.md).

| Published capability | Decision | Phase behavior / reason |
|----------------------|----------|-------------------------|
| Query replaceable kind `10002` | INTEGRATE | Use bounded public directory relays including `wss://purplepag.es`, verify signer-authored events, and deterministically select newest. |
| Interpret kind `10002` `r` markers | INTEGRATE | Use write and unmarked relays when retrieving the user's authored kind `10063`; exclude read-only relays. |
| Query replaceable kind `10063` | INTEGRATE | Verify signer authorship/signature, deterministically select newest, and retain ordered valid `server` tags. |
| Publish or mutate kind `10002`/`10063` | OPT-OUT | The build consumes the user's published preferences and must not change them. |
| Treat kind `10002` relays as storage servers | OPT-OUT | NIP-65 relay metadata and Blossom server preferences are distinct capability domains. |

### Blossom HTTP and BUDs

Canonical inventory: [Blossom repository BUD index](https://github.com/hzrd149/blossom#buds), with operation details in [BUD-00](https://github.com/hzrd149/blossom/blob/master/buds/00.md), [BUD-01](https://github.com/hzrd149/blossom/blob/master/buds/01.md), [BUD-02](https://github.com/hzrd149/blossom/blob/master/buds/02.md), [BUD-03](https://github.com/hzrd149/blossom/blob/master/buds/03.md), [BUD-04](https://github.com/hzrd149/blossom/blob/master/buds/04.md), [BUD-05](https://github.com/hzrd149/blossom/blob/master/buds/05.md), [BUD-06](https://github.com/hzrd149/blossom/blob/master/buds/06.md), [BUD-07](https://github.com/hzrd149/blossom/blob/master/buds/07.md), [BUD-08](https://github.com/hzrd149/blossom/blob/master/buds/08.md), [BUD-09](https://github.com/hzrd149/blossom/blob/master/buds/09.md), [BUD-10](https://github.com/hzrd149/blossom/blob/master/buds/10.md), [BUD-11](https://github.com/hzrd149/blossom/blob/master/buds/11.md), and [BUD-12](https://github.com/hzrd149/blossom/blob/master/buds/12.md).

| Published capability | Decision | Phase behavior / reason |
|----------------------|----------|-------------------------|
| BUD-00 SHA-256-addressed raw Blob model | INTEGRATE | Treat exact emitted bytes as the blob identity and never transform them between local hashing, upload, descriptor verification, and recovery. |
| BUD-01 `HEAD /<sha256>` existence check | INTEGRATE | Check content-addressed existence before an upload; validate every redirect target with the same public-network policy. |
| BUD-01 `GET /<sha256>` retrieval and optional range support | INTEGRATE via existing runtime | NAP-RESOURCE owns retrieval and hash verification; the build tool adds no direct browser/server fetch path. |
| BUD-02 `PUT /upload` exact-byte upload | INTEGRATE | Send exact emitted bytes with MIME, length, and `X-SHA-256`; accept only a descriptor matching local hash and byte count. |
| BUD-02 descriptor core fields | INTEGRATE | Validate `url`, lowercase `sha256`, `size`, `type`, and `uploaded`; ignore untrusted extra fields for control flow. |
| BUD-03 ordered kind `10063` server list | INTEGRATE | Preserve normalized first occurrence and attempt the first valid user server before secondary servers. |
| BUD-04 `PUT /mirror` | OPT-OUT | Direct exact-byte upload to each chosen secondary server avoids delegating a remote-fetch SSRF surface and preserves identical upload validation. |
| BUD-05 `HEAD /media` and `PUT /media` transforms | OPT-OUT | Media transforms intentionally change bytes/hashes, conflicting with emitted-byte identity and deterministic replacement. |
| BUD-06 `HEAD /upload` preflight | OPT-OUT | It is optional and non-binding; hash existence followed by the authoritative `PUT /upload` is sufficient. |
| BUD-07 payment negotiation | OPT-OUT | A noninteractive build cannot settle invoices; `402` is a redacted optimization failure that preserves the local artifact. |
| BUD-08 NIP-94 descriptor tags | OPT-OUT | Optional descriptor metadata is unrelated to the private emitted-asset mapping. |
| BUD-09 `PUT /report` | OPT-OUT | Reporting abusive blobs is unrelated to build publication. |
| BUD-10 Blossom URI schema | OPT-OUT | This artifact is bound to the different canonical `blossom:sha256:<hash>` form defined by NAP-RESOURCE; the two URI grammars must not be conflated. |
| BUD-11 kind `24242` `upload` authorization | INTEGRATE | Use human-readable content, short expiration, `t=upload`, exact lowercase `x` tags, lowercase-domain server scope, verified signer result, Base64url `Nostr` authorization encoding, and redacted diagnostics. |
| BUD-11 auth for download, mirror, media, list, or delete actions | OPT-OUT | Only upload authorization is requested; no unrelated signer authority is needed. |
| BUD-12 `GET /list/<pubkey>` | OPT-OUT | Listing is optional/unrecommended and unnecessary for content-addressed upload. |
| BUD-12 `DELETE /<sha256>` | OPT-OUT | Destructive remote lifecycle management is outside an optimizing build and would require separate explicit user intent. |

### NAP-RESOURCE Runtime

Canonical source: [NAP-RESOURCE proposal](https://github.com/napplet/naps/pull/80).

| Published capability | Decision | Phase behavior / reason |
|----------------------|----------|-------------------------|
| `blossom:sha256:<lowercase hash>` | INTEGRATE | This is the sole emitted external-resource URI form. |
| `resource.bytes` | INTEGRATE | Resolve lazy single-resource browser consumers through the injected domain. |
| `resource.bytesMany` | INTEGRATE | Resolve deterministic bounded groups, retaining per-item ordering and errors. |
| Runtime hash verification before Blob delivery | INTEGRATE | Treat returned bytes as usable only after the existing runtime integrity boundary succeeds. |
| Whole-Blob delivery | INTEGRATE | Tests and docs bound supported consumers to complete Blob semantics. |
| Streaming, range, progress, or a portable 50 MiB single blob | OPT-OUT | The proposal does not define those operations; the fixture uses several individually modest assets and documents the limitation. |
| New loader envelope, manifest tag, shell handshake, raw network grant | OPT-OUT | No such protocol surface exists; private loader/table bytes remain inside signed `/index.html`. |

## Multi-Source Coverage Audit

| Source | ID | Feature / constraint | Plan | Status | Notes |
|--------|----|----------------------|------|--------|-------|
| GOAL | — | Large single-file napplets target sub-2 MiB HTML by offloading eligible assets to user-selected Blossom and recover them through NAP-RESOURCE. | 162-01 through 162-11 | COVERED | Goal is finalized in ROADMAP by this planning pass. |
| REQ | — | Phase requirement IDs | — | EXCLUDED | ROADMAP says TBD; no IDs or probe predicates exist, and none are invented. |
| RESEARCH | R-01 | Preserve Vite boundaries, pure render/plan, transactional commit before manifest hashing. | 162-01, 162-09 | COVERED | Includes rollback, conditional requirement, and callback conflict paths. |
| RESEARCH | R-02 | Controlled Vite JS sentinels and parser-backed CSS references; safe optimization bypass on callback conflict. | 162-01, 162-07, 162-09 | COVERED | No arbitrary bundle string rewriting. |
| RESEARCH | R-03 | Private bounded loader over existing NAP-RESOURCE with explicit supported/unsupported consumers. | 162-01, 162-07, 162-10 | COVERED | Complete-Blob limitation remains visible. |
| RESEARCH | R-04 | Cross-runtime signer/key-store/discovery/upload extraction with Node and Deno adapters and no package cycle. | 162-02 through 162-06, 162-08 | COVERED | Existing CLI tests remain regression gates. |
| RESEARCH | R-05 | Verified Nostr discovery, BUD exact-byte upload, SSRF/redirect bounds, descriptor validation, and fail-closed local mutation. | 162-05, 162-06, 162-09 | COVERED | Security hardening is explicitly non-normative. |
| RESEARCH | R-06 | Audited `qrcode`, `@types/qrcode`, and `postcss-value-parser`; do not hand-roll terminal QR/CSS grammar. | 162-07, 162-08 | COVERED | Package legitimacy audit contains no ASSUMED/SUS/SLOP dependency. |
| RESEARCH | R-07 | Deterministic generated 50 MiB+ multi-asset proof with local Blossom and fake NAP-RESOURCE. | 162-10 | COVERED | No binaries committed. |
| RESEARCH | R-08 | Docs, changesets, secret scan, Deno regressions, full repository and AI-slop gates. | 162-04, 162-06, 162-10, 162-11 | COVERED | Outward actions occur only in Plan 11 after durable evidence. |
| CONTEXT | D-01..D-04 | Exact trigger, deterministic selection, stop rule, nonfatal exhaustion. | 162-01, 162-07, 162-09 | COVERED | — |
| CONTEXT | D-05..D-08 | NIP-46 QR/paste, least authority, secret persistence/redaction, tested extraction. | 162-02 through 162-04, 162-08, 162-11 | COVERED | — |
| CONTEXT | D-09..D-13 | Correct kind `10002` then write/unmarked-relay kind `10063` discovery and no unrelated fallback. | 162-05, 162-06, 162-08, 162-09 | COVERED | Corrected CONTEXT overrides stale spike/research copied wording. |
| CONTEXT | D-14..D-18 | Exact-byte upload, canonical URI, private mapping, verified destructive commit. | 162-01, 162-05, 162-06, 162-09 | COVERED | — |
| CONTEXT | D-19..D-21 | Existing NAP-RESOURCE only, bounded browser consumers, runtime hash boundary. | 162-01, 162-07, 162-09 | COVERED | Conditional resource requirement is existing NIP-5A surface. |
| CONTEXT | D-22..D-25 | 50 MiB+ demo, evidence, docs, changesets, full gates and ship. | 162-10, 162-11 | COVERED | Outward actions follow durable demonstration/docs commits. |
| CONTEXT | D-26..D-29 | Clear option, smallest cross-runtime seam, private loader shape, bounded fail-closed network behavior. | 162-01 through 162-09 | COVERED | Discretion is resolved in task actions. |

**Audit result:** all in-scope source items are covered; no phase split or developer decision is required before execution.
