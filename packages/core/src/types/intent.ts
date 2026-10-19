/** Runtime catalog selection preference; identifiers are opaque and runtime-local. */
export type IntentHandlerPreference = 'default' | 'choose' | (string & {});

/** Lifecycle hints; runtime policy remains authoritative. */
export interface IntentBehavior {
  /** Request focus for the target surface. */
  focus?: boolean;
  /** Permit reuse of an existing matching target. */
  reuse?: boolean;
}

/** A recommended named napplet, separate from explicit handler selection. */
export interface IntentHandlerHint {
  /** Kind 35129 coordinate; publisher and case-sensitive identifier are preserved. */
  address: string;
  /** Untrusted relay discovery hints, outside handler identity. */
  relays?: string[];
}

/** Options for the URI-based invoke and open operations. */
export interface IntentInvokeOptions {
  /** Structured payload; cannot accompany URI query parameters. */
  payload?: unknown;
  /** Runtime-authorized catalog selection preference. */
  handler?: IntentHandlerPreference;
  /** Recommendation; cannot accompany a URI handler fragment. */
  handlerHint?: IntentHandlerHint;
  /** Lifecycle and focus hints. */
  behavior?: IntentBehavior;
}

/** Options shared by open and invoke. */
export type IntentOpenOptions = IntentInvokeOptions;

/** The normalized wire request derived from an authoritative convention URI. */
export interface IntentRequest extends IntentInvokeOptions {
  /** Role derived from the convention URI. */
  archetype: string;
  /** Action derived from the convention URI. */
  action: string;
  /** Queryless, fragment-free convention identity. */
  convention: string;
}

/** A parsed manifest i-tag contract. */
export interface IntentContract {
  /** Stable convention identity. */
  convention: string;
  /** Advertised parameter names, in tag order. */
  params: string[];
}

/** An installed handler advertised by a verified manifest. */
export interface IntentCandidate {
  /** Opaque runtime catalog identifier, distinct from an endpoint or d tag. */
  id: string;
  /** Human-readable label. */
  title?: string;
  /** Unique actions derived from contracts for this role. */
  actions: string[];
  /** Unique stable convention identities for this role. */
  conventions: string[];
  /** Contracts eligible for this role. */
  contracts: IntentContract[];
  /** Whether this candidate is the user's default. */
  isDefault?: boolean;
}

/** Availability from the installed catalog, independent of running instances. */
export interface IntentAvailability {
  /** Queried role. */
  archetype: string;
  /** Whether a candidate is available. */
  available: boolean;
  /** Installed candidates. */
  candidates: IntentCandidate[];
  /** Whether the user has an applicable default. */
  hasDefault: boolean;
}

/** Acceptance transfers delivery responsibility to the runtime. */
export type IntentResult = {
  ok: true;
  archetype: string;
  action: string;
  convention: string;
  /** Resolved opaque catalog identifier. */
  handler: string;
} | {
  ok: false;
  /** Pre-acceptance failure reason. */
  error: string;
  archetype?: string;
  action?: string;
  convention?: string;
  handler?: string;
};

/** Runtime-attested delivery, independent of the source's lifecycle. */
export interface IntentDelivery {
  /** Source catalog identifier, supplied only by the runtime. */
  sender: string;
  archetype: string;
  action: string;
  convention: string;
  payload?: unknown;
}
