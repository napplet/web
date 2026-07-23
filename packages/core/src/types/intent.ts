/** How the shell should pick the handling napplet for an intent (NAP-INTENT). */
export type IntentHandlerPreference = 'default' | 'choose' | (string & {});

/** Window behavior hints for an intent invoke. */
export interface IntentBehavior {
  focus?: boolean;
  reuse?: boolean;
}

/** Optional caller inputs for a convention-URI invocation. */
export interface IntentInvokeOptions {
  /** Opaque structured payload for a queryless convention URI. */
  payload?: unknown;
  /** Runtime-authorized handler selection preference. */
  handler?: IntentHandlerPreference;
  /** Non-authoritative runtime lifecycle hints. */
  behavior?: IntentBehavior;
}

/** A normalized request to dispatch an action to a napplet archetype. */
export interface IntentRequest extends IntentInvokeOptions {
  /** Archetype derived from the authoritative convention URI. */
  archetype: string;
  /** Action derived from the authoritative convention URI. */
  action: string;
  /** Stable queryless convention identity derived from the URI. */
  convention: string;
}

/** A queryless convention contract parsed from one manifest archetype tag. */
export interface IntentContract {
  /** Stable, queryless convention identity. */
  convention: string;
  /** Optional unsigned discovery metadata; never inferred from payloads. */
  eventKinds?: number[];
}

/** A napplet that can fulfill an archetype (from the manifest catalog). */
export interface IntentCandidate {
  dTag: string;
  title?: string;
  actions: string[];
  conventions: string[];
  /** Manifest-derived contracts supported by this candidate. */
  contracts: IntentContract[];
  isDefault?: boolean;
}

/** Availability of an archetype, sourced from the installed-napplet catalog. */
export interface IntentAvailability {
  archetype: string;
  available: boolean;
  candidates: IntentCandidate[];
  hasDefault: boolean;
}

/** Runtime acceptance of responsibility for an eventual target delivery. */
export interface IntentAcceptedResult {
  ok: true;
  archetype: string;
  action: string;
  convention: string;
  handler: string;
}

/** A pre-acceptance rejection from the runtime. */
export interface IntentRejectedResult {
  ok: false;
  error: string;
}

/** The immediate acceptance or rejection result of an intent invocation. */
export type IntentResult = IntentAcceptedResult | IntentRejectedResult;

/**
 * A target-only runtime delivery after the target is ready.
 *
 * `sender` is runtime-attested provenance. Callers cannot supply or override it,
 * and receivers must treat `payload` as untrusted opaque data.
 */
export interface IntentDelivery {
  sender: string;
  archetype: string;
  action: string;
  convention: string;
  payload?: unknown;
}
