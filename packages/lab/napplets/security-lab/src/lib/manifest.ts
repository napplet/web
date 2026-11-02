// Manifest declarations shared between the build (vite.config.ts) and the
// runtime probes, so the "declared R domains are present" probe can never
// drift from what the signed manifest actually says.

/** NIP-5D `d` tag (named napplet, kind 35129). */
export const NAPPLET_ID = 'security-lab';

/** `R` tags: NAP domains the lab needs for its runtime-mediated probes. */
export const REQUIRED_DOMAINS = ['identity', 'relay', 'inc', 'storage', 'resource'] as const;

/** `O` tags: NAP domains the lab uses when present and degrades without. */
export const OPTIONAL_DOMAINS = ['theme'] as const;

export const NAPPLET_TITLE = 'Security Lab';
export const NAPPLET_DESCRIPTION =
  'Probes the sandbox, CSP, namespace and runtime boundaries of the NIP-5D shell hosting it.';
