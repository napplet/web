# NAPP actions, history and publication

Non-normative migration guidance. Compare the app's actual [NAPP actions](https://github.com/eskema/nostrapps/blob/main/NAPP.md#actions) with current [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md), [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [archetype guidance](https://github.com/napplet/naps/blob/master/ARCHETYPES.md) and [NIP-5D Manifest](https://github.com/nostr-protocol/nips/pull/2303/files). Read those sources before selecting a convention or emitting metadata.

## Map actions by meaning and payload

Build an action table covering both declarations and actual calls:

```text
source name/pattern | incoming/outgoing | payload variants | caller expects a return? | canonical target convention | target payload + validation | absent-handler behavior
```

`profile`, `view`, `view:0`, `feed`, `relay`, `wiki-term`, `hashtag`, `user-search` and `event-search` are source launcher action vocabulary. They do not become target domain names, wire types or conventions by replacing punctuation. Look up an existing target convention with matching meaning and payload. For example, consider `napplet:profile/open` for a profile-view flow only after checking its payload convention. If no shared convention exists, an app-specific convention can be documented as an application agreement under the current NAP rules; it does not create a new privileged shell capability or a registry standard.

Register delivery through the current SDK's INTENT handler API, advertise the supported conventions, and dispatch outgoing requests through INTENT invoke/open. Use INC only for genuine broadcasts or explicitly designed app messages. Replacing action dispatch with broadcast changes selection, delivery and lifecycle semantics.

Handle these differences explicitly:

- **Source payload resolution:** NAPP `view:<kind>` receives a resolved event; generic `view` can receive an unresolved pointer. Do not assume a target runtime fetches/normalizes it the same way. Specify accepted variants, validate kind/author/id/coordinate, and resolve references through mediated reads when the convention requires it.
- **Return values:** source actions such as user/event search or wiki lookup may return data. INTENT acceptance is not the chosen user/event or a completed operation. Inspect the living contract for a matching result mechanism. If absent, identify a real shared application reply convention/channel only where appropriate and implemented by both peers; otherwise flag the essential return-value gap. Never read an invented `result.payload` or call acceptance “completed.”
- **Existing instances:** source `{ instance }` and `{ auxiliary: true }` are launcher-specific routing semantics. Use only target behavior options actually defined at the current head; reuse/focus hints do not prove exact instance selection, auxiliary/headless mode or matching lifetime. Flag unsupported semantics rather than passing source fields through.
- **Delivery timing:** install handlers during initialization, accept later deliveries and follow the current delivery buffering rules. Invalid payloads render a useful error, not a top-level throw. Cancel/ignore previous async work when a new target arrives; a reused view must not display the earlier action's result.
- **Identity of the convention:** keep the stable queryless `napplet:<archetype>/<intent>` identity in manifest advertisements and exact-match routing. Advertised parameter names and delivered payload data are distinct. Use query shorthand only where the current binding defines it.

Validate payloads at the application boundary even when the runtime attests a sender. Sender identity does not make event content or a supplied URL safe to render. Test both valid and malformed input, missing handler/denial, startup delivery and a second delivery while a fetch is pending.

## History and per-window state

The source launcher's `popstate`, `__action_popstate_idx`, `__popstate_last_idx`, `window.name` and service-worker origin setup are implementation-specific. Remove those dependencies; do not reproduce them in a fake `window.napp`.

Local back/forward view state may remain app logic where supported, but it does not automatically report locations to the shell. If host navigation history or exact routing is essential, inspect the current [NAP-NAVIGATION proposal](https://github.com/napplet/naps/pull/126), its status, installed exports and target support; do not assume a proposal is shipped or invent a navigation message. If unsupported, keep a documented local state stack when that preserves the requested behavior, or flag the essential gap.

Choose memory for transient state, STORAGE instance scope for appropriate per-window state, and shared scope for intended cross-instance preferences. Reopening a window and switching accounts need distinct tests. A target-generated opaque instance identity is not the source `window.name` string or a bare `d` tag.

## Translate metadata through the current toolchain

A NAPP is a folder with `metadata.json` published as source kind `35130`. A napplet uses NIP-5D's own manifest and self-contained artifact. Retagging a source event does not perform the migration. Use CLI initialization/configuration and the build plugin to produce metadata, then inspect the final current-format dry-run event. The mappings below are migration decisions, not a full manifest schema.

| NAPP input | Target handling |
| --- | --- |
| `id` | Candidate deployment identifier for a named napplet, subject to the chosen NIP-5D manifest kind. Do not copy source origin identity or assume a bare identifier scopes storage/permissions. |
| `title` / `description` | Preserve human meaning through current title and plain-text description fields. Keep document title for publishing/accessibility even when removing a duplicate visible title header. |
| URL/path `icon`, often SVG | NIP-5D's icon is content-addressed image bytes in a supported format. Inspect current Icon requirements; prepare PNG/JPEG/WebP as needed, hash actual bytes and use the toolchain's asset publishing support. Do not copy `/icon.svg` or an HTTPS URL into the target hash field. |
| `requires: ['ui', 'network', 'identity', 'dev', ...]` | Recompute target hard requirements and optional integrations from the ledger. Source UI injection, raw network and install permissions do not correspond to target NAPs. Current target `R`/`O` declarations are not permission grants. |
| `actions` / source `action` tags | Translate supported meanings to target archetype/accepted-intent advertisements and handlers. Do not retain the source tags or copy `view:kind` as a target intent. |
| `modes: normal/auxiliary/headless`, `initial_size` | Check current canonical target fields/operations. Preserve useful responsive behavior and documented deployment preferences where supported; do not invent manifest tags for source-only modes/window sizing. |
| Folder paths / source launcher origin | Bundle into `/index.html`; current artifact identity hashes those final bytes. Do not import source multi-file path maps or NIP-5A aggregate hashes. |

Inspect the generated artifact and deployment preview together: chosen kind/identifier rules, non-empty plain-text description, final artifact hash, icon bytes/hash/type, archetypes/intents and every required/optional domain. Where HTML descriptive metadata is generated, ensure it agrees with the publishing inputs and is finalized before artifact hashing. A helper import or presence check alone does not declare a capability.

If existing users need continuity, document the new application address and explicit supported state-transfer process. The source NAPP event address, grants, installed-app identity and old data do not automatically migrate. Keep optional Zapstore metadata separate from NIP-5D identity and icon fields. Do not publish either event without authorization.
