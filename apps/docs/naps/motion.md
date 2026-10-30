# MOTION

This is non-normative package guidance for the draft [NAP-MOTION proposal](https://github.com/napplet/naps/pull/124). The living proposal defines the contract. Motion is optional: check `window.napplet?.motion` and keep pointer or keyboard controls when it is absent, denied, or unavailable.

## Read motion through the SDK

Import `motion` from `@napplet/sdk` or `@napplet/sdk/motion`. Its methods are `requestPermission(absolute?)`, `state()`, `latest()`, `onState(handler)`, and `onSample(handler)`. The NAP package exposes prefixed helpers such as `motionRequestPermission` through `@napplet/nap/motion` and `@napplet/nap/motion/sdk`; types and runtime installation live at its `/types` and `/shim` subpaths.

```ts
import { motion } from '@napplet/sdk/motion';

const enable = document.querySelector<HTMLButtonElement>('#enable-motion')!;
const status = document.querySelector<HTMLOutputElement>('#motion-status')!;
if (window.napplet?.motion) {
  enable.onclick = async () => {
    // Explain the feature in the UI before this user action requests a grant.
    const result = await motion.requestPermission();
    status.textContent = result.error ?? result.permission;
  };
  const states = motion.onState(state => {
    status.textContent = state.focused ? 'Motion active' : 'Motion paused';
  });
  const samples = motion.onSample(sample => {
    console.log(sample.acceleration, sample.rotationRate, sample.orientation);
  });
  // Close states and samples when the owning view is disposed.
} else {
  enable.disabled = true;
  status.textContent = 'Use pointer or keyboard controls';
}
```

`state()` returns a copy of the cached snapshot synchronously. Before the first snapshot it reports `available: true`, `permission: 'prompt'`, `absolute: false`, `focused: false`, and `frequency: 0`. `latest()` returns a copied sample or `null`; a focus or grant loss clears the sample, so it stays `null` after focus returns until a fresh sample arrives. Pause integration across such gaps. Sensor components and individual axes can be `null` when the host cannot measure them.

`requestPermission(true)` also asks for absolute orientation. A relative motion grant does not imply an absolute grant; inspect the result’s `absolute` field before using compass heading. Shell-reported permission errors resolve as `{ permission, absolute, error }`; transport failures and timeouts reject. Registering listeners and reading cached state do not request permission. Each listener handle closes independently.

## Manifest and runtime integration

Use `optional: ['motion']` in the Vite plugin when other controls fulfill the core task. Requirement inference recognizes `@napplet/sdk/motion`, `@napplet/nap/motion`, and direct `window.napplet.motion` reads. An explicit optional declaration remains an `O` tag. Use a hard `R` requirement only when the app cannot function without motion.

The runtime owns sensor reads, grants, focus/visibility gating, rate limits, and quantization. The injected binding subscribes on first use, validates parent messages, and unsubscribes on cleanup. It does not replace native `DeviceMotionEvent`, `DeviceOrientationEvent`, or Generic Sensor APIs. Shells apply `accelerometer`, `gyroscope`, and `magnetometer` denial using iframe Permissions Policy; enforcement varies by host, so domain presence does not prove native sensor isolation.

The conformance reference shell reports sensors as unavailable and responds to permission requests with a correlated error. Its fallback prelude exposes the complete motion API, and its iframe applies all three sensor denial features. Automated fixture tests cover wire behavior and cache handling; verify real sensor delivery, user prompts, revocation, and focus/visibility transitions in a motion-capable shell separately.
