/** Optional NAP-SHELL environment snapshot; never a grant. */
export interface ShellCapabilities {
  /** Bare domains exposed at snapshot time. */
  domains: string[];
}

/** Optional environment delivered once per authenticated endpoint lifecycle. */
export interface ShellEnvironment {
  capabilities: ShellCapabilities;
  services: string[];
}

/** Optional environment API, independent of other domain availability. */
export interface ShellApi {
  /** Query current injected domain presence synchronously. */
  supports(domain: string): boolean;
  /** Read the retained environment's service names; empty before init. */
  readonly services: readonly string[];
  /** Await the retained environment without sending another readiness signal. */
  ready(): Promise<ShellEnvironment>;
  /** Receive the environment once, including when registered after init. */
  onReady(handler: (environment: ShellEnvironment) => void): import('./nostr.js').Subscription;
}
