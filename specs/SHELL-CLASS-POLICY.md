# Shell Class Policy Checklist

> Shell-implementer guide for v0.29.0+ napplet hosts implementing NAP-CLASS.
> Normative wire shape and MUST/SHOULD language live in NAP-CLASS (napplet/naps); this document is a deployment checklist.

## Status

This is a non-normative implementer's guide. The normative spec is **NAP-CLASS** in the `napplet/naps` repo, with concrete postures defined in `NAP-CLASS-1.md` and `NAP-CLASS-2.md`. Shell hosts MUST implement the MUSTs stated there; this document enumerates the concrete decisions a deployer needs to make and surfaces every shell-side MUST as a sign-off checkbox.

Sibling deployer-policy docs are [SHELL-CONNECT-POLICY.md](./SHELL-CONNECT-POLICY.md) — the class-contributing NAP whose grant state drives the NAP-CLASS-2 posture — and [SHELL-RESOURCE-POLICY.md](./SHELL-RESOURCE-POLICY.md) — the read-only sibling. Shells implementing NAP-CLASS alongside either of those NAPs MUST treat the relevant policy doc as a required companion to this one.

## Why this exists

NAP-CLASS is the shell-to-napplet signal that tells the napplet which security posture the shell is enforcing. The posture itself — CSP shape, sandbox flags, consent state — is applied at frame creation time, before any napplet code runs; the wire envelope is the napplet-side reflection of that enforcement decision, not a substitute for it. The integer carried by `class.assigned` is informational to the napplet, not instructive to the shell.

A shell that implements NAP-CLASS incorrectly can cause two distinct silent-failure modes. First, sending `class.assigned` with a value that disagrees with the shell's actual CSP header: the napplet branches on a lie, believing itself to be in one posture while the browser is enforcing another. Second, in shells implementing both NAP-CLASS and NAP-CONNECT, emitting a state where `class === 2` AND `connect.granted === false` (or vice-versa): the cross-NAP invariant that napplets rely on breaks, and the napplet's "am I allowed to talk to foo.com" reasoning produces an answer that does not match what the browser will actually permit. Neither failure surfaces a browser diagnostic. Neither is caught by a "does the napplet load" smoke test. Both are detectable only by walking through the Audit Checklist below before deployment.

Deployers SHOULD treat the Audit Checklist at the bottom of this document as a sign-off gate and retain the completed list as deployment evidence.

## Class-Determination Authority (MUST)

The shell is the sole authority on what class a napplet is assigned. Class is determined by:

- Which class-contributing NAPs are declared in the napplet's NIP-5A manifest (for example, presence of `['connect', '<origin>']` tags under NAP-CONNECT promotes the napplet toward the NAP-CLASS-2 posture defined in `NAP-CLASS-2.md`).
- Any user-consent outcomes from NAPs that prompt (NAP-CONNECT's first-load prompt, and any future class-contributing NAP that gates on user decision).
- Any shell-deployment-policy inputs (operator refuses cleartext and thereby forces a different class, operator has globally denied the napplet, operator runs a kiosk profile that locks every napplet to NAP-CLASS-1, and similar).

Napplets MUST NOT attempt to infer their own class from the environment — from the CSP they observe, from the capabilities the shell advertises, from the presence or absence of other NAPs. The `class.assigned` envelope is the only authoritative signal. Shells MUST therefore send the envelope — silence is not the same signal as explicit assignment. A shell that implements `nap:class` but fails to deliver `class.assigned` is non-conformant; a shell that simply does not advertise `nap:class` is conformantly unclassified, and the napplet treats itself as such per NAP-CLASS's Graceful Degradation section.

Dynamic mid-session re-classification is out of scope for v1. A shell that needs to change posture for an already-running napplet MUST tear down the current iframe and create a new one. The new lifecycle begins with its own `class.assigned` envelope.

At most one `class.assigned` envelope per napplet lifecycle. A second envelope is a protocol violation; shells MUST NOT emit one to 'upgrade' or 'downgrade' a class mid-session. See NAP-CLASS's Security Considerations, At-most-one envelope, for the normative source.

## Wire Timing (MUST)

The `class.assigned` envelope MUST be sent AFTER the iframe signals readiness (shim bootstrap complete) and BEFORE the napplet's own code can meaningfully branch on class.

The 'before' side is the harder constraint to get right. Coupling to the shim ready signal is the recommended approach: the shim emits a post-install signal once `window.napplet` is fully populated, the shell listens for that signal, and the shell dispatches `class.assigned` synchronously in response. This guarantees the envelope arrives before the napplet's first `DOMContentLoaded` handler runs, which in turn guarantees any napplet code path that reads `window.napplet.class` sees a populated value — not the `undefined` race where early-script readers get `undefined` and late-script readers get the integer, and the two paths produce inconsistent behavior from the same codebase.

The 'after' side is the complementary race. Sending `class.assigned` before iframe ready risks the envelope being dispatched into a dead listener — the shim's handler is registered at install, and any `class.assigned` received before install completes is lost. Shells MUST NOT pre-send the envelope at iframe creation and hope the shim catches it. There is no buffering layer in the napplet frame that will retain pre-install envelopes for replay.

A minimal conformant integration: the shell's iframe-message handler listens for the shim's post-install emission (a ready envelope or a well-known `window.napplet` presence check, per the shim's published ready-signal contract) and dispatches `class.assigned` synchronously on receipt. Shells implementing both NAP-CLASS and class-contributing NAPs (such as NAP-CONNECT, whose `<meta name="napplet-connect-granted">` is injected at serve time rather than post-facto) MUST order the frame lifecycle so that shim bootstrap completes, `class.assigned` arrives, and only then does any napplet-observable state change based on class. Out-of-order emission produces the same race the shim-ready-signal pattern is designed to prevent.

## Cross-NAP Invariant (MUST — Shell Responsibility)

NAP-CLASS has no opinion on which integer is 'correct' for a given napplet. It specifies only how that integer is communicated. The correctness question is owned by the class-contributing NAPs — and in a shell implementing BOTH NAP-CLASS AND a class-contributing NAP, the shell MUST NOT emit a state where the two signals disagree.

For shells implementing BOTH `nap:class` AND `nap:connect`, the following MUST hold at the time `class.assigned` is sent:

- `class === 2` iff `connect.granted === true`
- `class === 1` iff `connect.granted === false` (either denied, or no `connect` tags in manifest)

Shells MUST NOT emit a state where `class === 2` AND `connect.granted === false`, or where `class === 1` AND `connect.granted === true`. Both states are non-conformant.

### Scenario Table

| Scenario | `nap:connect` advertised? | `connect` tags in manifest? | User decision | Shell MUST emit | `class.assigned` | `connect.granted` |
|----------|---------------------------|------------------------------|---------------|-----------------|-------------------|-------------------|
| User approves Class-2 prompt | yes | yes | approved | `connect-src <origins>` CSP header + `<meta name="napplet-connect-granted" content="<origins>">` | `class: 2` | `true` |
| User denies Class-2 prompt | yes | yes | denied | `connect-src 'none'` CSP header + empty-content meta tag | `class: 1` | `false` |
| No `connect` tags (vanilla Class-1) | yes | no | n/a | `connect-src 'none'` CSP header + empty-content meta tag OR absent meta | `class: 1` | `false` |
| Shell does NOT implement `nap:connect` | no | (any) | (any) | shell-baseline CSP; no `napplet-connect-granted` meta | `class: 1` (or absent if `nap:class` also not implemented) | `false` (default) |
| Shell implements `nap:class` but not `nap:connect` | no | yes | n/a | refuse-to-serve the napplet with a diagnostic ('this shell does not implement NAP-CONNECT; this napplet requires it') OR treat as Class-1 with a deployment warning | `class: 1` | `false` (default) |
| Shell implements `nap:connect` but not `nap:class` | yes | yes | approved | `connect-src <origins>` CSP + granted meta | (no envelope) | `true` |
| Future class-contributing NAPs | yes | (varies) | (varies) | posture-specific | `class: N` (per the contributing NAP's track doc) | (varies) |

Shells MUST NOT emit a scenario outside this table. A state where `class === 2` AND `connect.granted === false`, or `class === 1` AND `connect.granted === true`, is non-conformant and is the exact silent-failure mode this cross-NAP invariant exists to prevent.

The invariant is checked at `class.assigned` send time only. Subsequent revocation of a connect grant does not retroactively invalidate the envelope that was correct at send time; see Revocation UX below for the forward-correction path that keeps the two signals in agreement across a revocation event.

## Revocation UX for Class-2 Napplets (MUST)

Revoking a connect grant MUST NOT result in a running Class-2 napplet continuing to see `class === 2` while `connect.granted === false`. NAP-CLASS's at-most-one-envelope rule forbids in-session class re-assignment, so revocation produces one of two conformant outcomes at the shell's choice:

### Option A: Reload on revocation (recommended)

The shell tears down the current napplet iframe on revocation. A new iframe is created, which begins its own NAP-CLASS lifecycle with `class.assigned: { class: 1 }` and `connect-src 'none'`. The napplet observes a page reload and re-bootstraps into the strict posture. This is the lowest-complexity path and the one recommended for most shells — the user's revocation action produces a visible UI event (reload), and the napplet's runtime state and CSP posture are both updated atomically at the moment of frame re-creation.

### Option B: Refuse-to-serve until re-approval

The shell tears down the current iframe on revocation and does NOT immediately create a new one; instead, it surfaces a re-approval affordance in the shell UI and waits for the user to either re-approve (producing a fresh consent prompt, since the `(dTag, aggregateHash)` is now in the DENIED state per `NAP-CLASS-2.md`'s revocation semantics) or navigate away. This is useful for shells that want to make the revocation explicit to the user at the UX layer — the napplet surface disappears, a "this napplet's network grant was revoked; re-approve?" affordance takes its place, and the user explicitly decides whether to continue.

Mid-session dynamic class change is out of v0.29.0 scope. Shells MUST NOT send a second `class.assigned` to an existing iframe to signal revocation — see NAP-CLASS's Security Considerations, At-most-one envelope. A shell that attempts a mid-session re-assignment is violating the normative protocol even if every other surface looks correct.

See [SHELL-CONNECT-POLICY.md](./SHELL-CONNECT-POLICY.md)'s Revocation UX section for the shell-CONNECT side of the responsibility: exposing the user-facing revocation affordance on the settings surface, moving revoked grants to DENIED state (not deleted), and taking effect at next `(dTag, aggregateHash)` load. The two policy docs together cover the full revocation flow — SHELL-CONNECT-POLICY owns the "how does the user revoke" UX question, this document owns the "what happens to a running napplet when they do" enforcement question.

## Audit Checklist (one-page summary)

Use this as a deployment sign-off. Every item is a MUST unless explicitly marked otherwise. A deployment SHOULD NOT be considered compliant until every box is checked.

- [ ] `shell.supports('nap:class')` returns `true` if and only if this NAP is implemented (POLICY-11)
- [ ] Shell is the sole authority on class — no napplet-side inference path, no environment-sniffing path accepted (POLICY-12)
- [ ] Class is determined by manifest class-contributing NAPs + user-consent outcomes + deployment policy (POLICY-12)
- [ ] Exactly one `class.assigned` envelope per napplet lifecycle; shell does NOT emit a second (POLICY-12)
- [ ] Silence is not an acceptable signal — shells advertising `nap:class` MUST deliver `class.assigned` for every lifecycle (POLICY-12)
- [ ] Dynamic mid-session re-classification is NOT implemented (out of scope for v0.29.0) (POLICY-12)
- [ ] `class.assigned` sent AFTER shim bootstrap complete / iframe ready signal (POLICY-13)
- [ ] `class.assigned` sent BEFORE napplet code can meaningfully branch on class (POLICY-13)
- [ ] Integration is coupled to the shim's ready signal (recommended); shell does NOT pre-send at iframe creation and hope the shim catches the envelope (POLICY-13)
- [ ] In shells implementing BOTH nap:class AND nap:connect: `class === 2` iff `connect.granted === true` at send time (POLICY-14)
- [ ] No emitted state outside the scenario table in Cross-NAP Invariant (POLICY-14)
- [ ] Revocation of a connect grant triggers EITHER iframe reload with `class: 1` (Option A) OR refuse-to-serve until re-approval (Option B) (POLICY-15)
- [ ] Revocation does NOT attempt mid-session `class.assigned` re-emission (POLICY-15)
- [ ] SHELL-CONNECT-POLICY audit checklist also completed if implementing both NAPs (POLICY-14, POLICY-15 cross-ref)

## References

- **NAP-CLASS** — parent class-track spec; defines the `class.assigned` envelope, the `window.napplet.class` runtime surface, and the authoring rules for track members. Repo: `napplet/naps`.
- **NAP-CLASS-1.md** — default strict posture (`connect-src 'none'`, no consent, residual meta-CSP harmless). Repo: `napplet/naps`.
- **NAP-CLASS-2.md** — user-approved explicit-origin posture (`connect-src <granted-origins>`, first-load prompt, residual meta-CSP refuse-to-serve, revocation timing). Repo: `napplet/naps`.
- **NAP-CONNECT** — class-contributing NAP whose grant state drives the cross-NAP invariant for shells implementing both. Repo: `napplet/naps`.
- [NIP-5D](./NIP-5D.md) — parent transport spec (JSON envelope wire format, iframe sandbox model, capability advertisement surface).
- [SHELL-CONNECT-POLICY.md](./SHELL-CONNECT-POLICY.md) — sibling deployer-policy doc for NAP-CONNECT; required reading for shells implementing both NAPs.
- [SHELL-RESOURCE-POLICY.md](./SHELL-RESOURCE-POLICY.md) — sibling deployer-policy doc for the read-only NAP.
