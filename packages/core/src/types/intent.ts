/** How the shell should pick the handling napplet for an intent (NAP-INTENT). */
export type IntentHandlerPreference = 'default' | 'choose' | (string & {});

/** Window behavior hints for an intent invoke. */
export interface IntentBehavior {
  focus?: boolean;
  newWindow?: boolean;
  reuse?: boolean;
}

/** A request to dispatch an action to a napplet of a given archetype. */
export interface IntentRequest {
  archetype: string;
  action?: string;
  protocol?: string;
  payload?: unknown;
  handler?: IntentHandlerPreference;
  behavior?: IntentBehavior;
}

/** One manifest-derived contract a napplet serves for an archetype. */
export interface IntentContract {
  action: string;
  protocol: string;
  eventKinds?: number[];
}

/** A napplet that can fulfill an archetype (from the manifest catalog). */
export interface IntentCandidate {
  dTag: string;
  title?: string;
  actions: string[];
  protocols: string[];
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

/** The result of an intent invocation. */
export interface IntentResult {
  ok: boolean;
  archetype: string;
  action: string;
  handled: boolean;
  handler?: string;
  windowId?: string;
  protocol?: string;
  error?: string;
}
