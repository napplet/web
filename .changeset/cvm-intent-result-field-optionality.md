---
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
---

Match `cvm.discover.result`, `intent.available.result`, and `intent.handlers.result` field optionality to the NAP text.

`CvmDiscoverResultMessage` is now a union of `CvmDiscoverSuccessResultMessage` (`servers` required, no `error`) and `CvmDiscoverErrorResultMessage` (`error`, no `servers`), following NAP-CVM §Error Handling: "On a shell error, success payload fields MUST be omitted. On success, the operation's payload is required." `cvm.discover()` now rejects a result that has neither field instead of resolving `[]`.

`IntentAvailableResultMessage.availability` and `IntentHandlersResultMessage.handlers` are now required, matching the NAP-INTENT wire table (`id`, `availability`, `error`? and `id`, `handlers`, `error`?). `intent.available()` and `intent.handlers()` now reject with the top-level `error` when it is present, even if a payload accompanies it, and still reject a result that omits its payload.

The conformance envelope specs require `availability` (object) and `handlers` (array) on the intent query results and only `id` on `cvm.discover.result`.
