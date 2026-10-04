# @napplet/conformance-web

## 0.0.19

### Patch Changes

- Adopt the current NIP-5D artifact-hash manifest schema for kinds 5129, 15129 and 35129. Writers emit one direct artifact `x` hash, description content, required/optional `R`/`O` domains and independent `z`/`i` advertisements. Readers verify current events and raw artifact bytes; legacy events require migration or older readers.

  CLI deployment defaults to current output and offers temporary explicit legacy serialization. Add offline signed-event migration previews without altering source events or publishing. Vite builds default to a self-contained artifact; compatibility helper and sidecar names remain available. See the event migration guide for package cutoffs, immutable pointers and shell ACL/storage implications.

- Updated dependencies
  - @napplet/conformance@0.18.0

## 0.0.18

### Patch Changes

- Updated dependencies [19e0029]
  - @napplet/conformance@0.17.0

## 0.0.17

### Patch Changes

- Updated dependencies [d201bd0]
- Updated dependencies [d201bd0]
  - @napplet/conformance@0.16.0

## 0.0.16

### Patch Changes

- Updated dependencies [7b67562]
  - @napplet/conformance@0.15.0

## 0.0.15

### Patch Changes

- Updated dependencies [dd7b3a7]
  - @napplet/conformance@0.14.0

## 0.0.14

### Patch Changes

- Updated dependencies [3dbced2]
  - @napplet/conformance@0.13.0

## 0.0.13

### Patch Changes

- Updated dependencies [6ccb056]
  - @napplet/conformance@0.12.0

## 0.0.12

### Patch Changes

- Updated dependencies [284e100]
  - @napplet/conformance@0.11.0

## 0.0.11

### Patch Changes

- Updated dependencies [c711a3e]
- Updated dependencies [ce41387]
- Updated dependencies [50b3c1b]
  - @napplet/conformance@0.10.0

## 0.0.10

### Patch Changes

- 688fb59: Align first-party packages with current NIP-5D runtime injection.

  Runtimes now expose available NAPs by injecting `window.napplet.<domain>`
  properties before napplet code runs. The retired generic shell capability
  surface is removed from active package APIs: no `window.napplet.shell`, no
  `shell.ready` / `shell.init` handshake, and no `@napplet/nap/shell` subpath.

  Conformance now injects the runtime namespace before fixture code and validates
  only NAP domain envelopes. Skills and package guidance now teach domain-property
  presence instead of the retired shell supports API.

- Updated dependencies [688fb59]
  - @napplet/conformance@0.9.1

## 0.0.9

### Patch Changes

- Updated dependencies [7e0c5bc]
  - @napplet/conformance@0.9.0

## 0.0.8

### Patch Changes

- Updated dependencies [b0e0c76]
  - @napplet/conformance@0.8.0

## 0.0.7

### Patch Changes

- Updated dependencies [c6f8645]
  - @napplet/conformance@0.7.0

## 0.0.6

### Patch Changes

- Updated dependencies [61431b7]
- Updated dependencies [086f36e]
  - @napplet/conformance@0.6.0

## 0.0.5

### Patch Changes

- Updated dependencies [5cb3187]
  - @napplet/conformance@0.5.0

## 0.0.4

### Patch Changes

- Updated dependencies [488ca0a]
  - @napplet/conformance@0.4.0

## 0.0.3

### Patch Changes

- Updated dependencies [6dcb2ac]
  - @napplet/conformance@0.3.0

## 0.0.2

### Patch Changes

- Updated dependencies [b75880f]
  - @napplet/conformance@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [c8d0198]
  - @napplet/conformance@0.1.0
