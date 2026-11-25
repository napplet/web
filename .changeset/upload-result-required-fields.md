---
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
---

Require `info` on `upload.info.result` and `status` on `upload.status.result`, matching the NAP-UPLOAD wire table (`id`, `info`, `error?` and `id`, `status`, `error?`).

`UploadInfoResultMessage.info` and `UploadStatusResultMessage.status` are now required. `upload.info()` and `upload.status()` now reject with the top-level `error` when it is present, even if a payload accompanies it, and still reject a result that omits its payload. A shell with nothing to disclose can answer `upload.info` with `info: { rails: [] }`. `upload.upload.result` is unchanged.

The conformance envelope specs require `info` (object) on `upload.info.result` and `status` (object) on `upload.status.result`.
