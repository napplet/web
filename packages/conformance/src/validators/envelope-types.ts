/** Direction of an envelope relative to the napplet. */
export type EnvelopeDirection = 'out' | 'in';

/**
 * Lightweight runtime kind for a required field. `present` means "must exist,
 * any type" — used for union-typed fields (e.g. filters that may be a single
 * filter object or an array) where a stricter check would produce false negatives.
 */
export type FieldKind = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'present';

/** Specification for a single wire envelope `type`. */
export interface EnvelopeSpec {
  /** `out` = sent by the napplet to the shell; `in` = sent by the shell to the napplet. */
  dir: EnvelopeDirection;
  /** Required carrier fields (name → kind). */
  fields?: Record<string, FieldKind>;
  /** Fields a napplet-emitted carrier must never supply. */
  forbiddenFields?: readonly string[];
  /** Why `forbiddenFields` are rejected; defaults to "runtime-derived". */
  forbiddenReason?: string;
}

/** A single problem found while validating an envelope. */
export interface EnvelopeError {
  /** Machine-readable code: not-an-object | missing-type | malformed-type | unknown-domain | unknown-type | inbound-type-emitted | missing-field | wrong-type | invalid-intent-request */
  code:
    | 'not-an-object'
    | 'missing-type'
    | 'malformed-type'
    | 'unknown-domain'
    | 'unknown-type'
    | 'inbound-type-emitted'
    | 'missing-field'
    | 'wrong-type'
    | 'forbidden-field'
    | 'invalid-intent-request'
    | 'invalid-resource-request';
  /** Human-readable explanation. */
  message: string;
  /** Field name, when the error concerns a specific field. */
  field?: string;
}

/** Verdict returned by {@link validateEnvelope}. */
export interface EnvelopeVerdict {
  /** True when the envelope is a well-formed, napplet-emittable (outbound) message. */
  ok: boolean;
  /** The envelope's `type` discriminant, when present and a string. */
  type?: string;
  /** The domain (part before the first `.`), when derivable. */
  domain?: string;
  /** Direction recorded in {@link ENVELOPE_SPECS}, when the type is known. */
  direction?: EnvelopeDirection;
  /** Problems found (empty when `ok`). */
  errors: EnvelopeError[];
}
