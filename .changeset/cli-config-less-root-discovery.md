---
"@napplet/cli": patch
---

`napplet discover` and `napplet deploy --all` now work from a directory without a `.napplet` config, such as a monorepo root. They search subdirectories for napplets that carry their own `.napplet/config.yaml`, and deploy runs once per napplet with that napplet's own config. `--name` selects napplets by folder name. A bare interactive `napplet deploy` there asks whether to search subdirectories (default no) before falling back to guided setup.
