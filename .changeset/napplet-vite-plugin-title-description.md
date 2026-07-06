---
"@napplet/vite-plugin": minor
---

Add `title` and `description` plugin options that inject/override the built HTML `<title>` element and `<meta name="description">` element. Both are plain HTML (not `napplet-*` protocol meta tags): when set they override any existing tag (inserting one after `<head>` if absent) and when omitted the author's HTML is left untouched. Injected values are HTML-escaped for their context. The napplet CLI reads these back out of the built `index.html` to emit the NIP-5A `title` / `description` manifest tags at deploy time.
