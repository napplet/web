# Exclude local deploy state

## Problem

Running `napplet deploy` from a single-file repo can use `sourceDir: "."`. The
deploy manifest collector currently walks every file under that directory, which
means local control state such as `.napplet/config.json` can be hashed and
published as napplet content.

## Target

- Keep local hidden/control paths out of deploy manifest file mappings.
- Preserve intentional `.well-known` content.
- Keep dependency trees such as `node_modules` out of deploy content.
- Continue reading `.nip5a-manifest.json` as metadata only, never as a deployed
  path.

## Verification

- Unit coverage for hidden/control paths, `node_modules`, and `.well-known`.
- CLI package check/test/lint.
- Real `napplet deploy --dry-run` fixture proving `.napplet/config.json` is not
  present in output.
- Root gates before pushing the PR update.
