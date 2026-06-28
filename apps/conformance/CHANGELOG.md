# @napplet/conformance-web

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
