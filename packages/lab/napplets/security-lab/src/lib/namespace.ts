// Inspection of the shell-injected `window.napplet` namespace (NIP-5D
// §Transport / §Runtime Domain Availability). Pure: takes the window-like
// object and the MessagePort constructor so tests can supply fakes.

export interface NamespaceInspection {
  /** `window.napplet` exists and is a non-null object. */
  present: boolean;
  /** Keys whose values are non-null objects or functions: candidate domain objects. */
  domains: string[];
  /** Keys whose values are primitives / null: not domain objects (MUST contain only domain objects). */
  invalidKeys: string[];
  /** Keys that are not bare NAP domain names (`relay`, never `NAP-RELAY` or `perm:relay`). */
  malformedNames: string[];
  /** Property paths at which a MessagePort instance was reachable. MUST be empty. */
  reachablePorts: string[];
}

const BARE_DOMAIN = /^[a-z][a-z0-9-]*$/;

type AnyRecord = Record<string, unknown>;

function ownKeys(value: object): string[] {
  try {
    return Object.getOwnPropertyNames(value);
  } catch {
    return [];
  }
}

function readProp(target: object, key: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: (target as AnyRecord)[key] };
  } catch {
    return { ok: false };
  }
}

/**
 * Walk own properties (depth-limited) looking for MessagePort instances.
 * Getters that throw are skipped; cycles are cut by the visited set.
 */
export function findReachablePorts(
  root: unknown,
  label: string,
  portCtor: unknown,
  maxDepth = 3,
): string[] {
  const found: string[] = [];
  if (typeof portCtor !== 'function') return found;
  const visited = new WeakSet<object>();

  const visit = (value: unknown, path: string, depth: number): void => {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
    if (visited.has(value as object)) return;
    visited.add(value as object);
    if (value instanceof (portCtor as new () => unknown)) {
      found.push(path);
      return;
    }
    if (depth >= maxDepth) return;
    for (const key of ownKeys(value as object)) {
      const read = readProp(value as object, key);
      if (!read.ok) continue;
      visit(read.value, `${path}.${key}`, depth + 1);
    }
  };

  visit(root, label, 0);
  return found;
}

export interface InspectNamespaceOptions {
  /** The MessagePort constructor of the napplet realm; defaults to the global one. */
  portCtor?: unknown;
  /** How deep to scan `window.napplet` for ports. */
  namespaceDepth?: number;
}

export function inspectNamespace(win: object, options: InspectNamespaceOptions = {}): NamespaceInspection {
  const portCtor = options.portCtor ?? (globalThis as AnyRecord).MessagePort;
  const read = readProp(win, 'napplet');
  const namespace = read.ok && read.value && typeof read.value === 'object' ? (read.value as AnyRecord) : null;

  const domains: string[] = [];
  const invalidKeys: string[] = [];
  const malformedNames: string[] = [];

  if (namespace) {
    for (const key of ownKeys(namespace)) {
      const prop = readProp(namespace, key);
      const value = prop.ok ? prop.value : undefined;
      const isObjectLike = !!value && (typeof value === 'object' || typeof value === 'function');
      if (isObjectLike) domains.push(key);
      else invalidKeys.push(key);
      if (!BARE_DOMAIN.test(key)) malformedNames.push(key);
    }
  }

  // Direct window globals (depth 1) plus a deeper walk of the namespace itself.
  const reachablePorts = [
    ...findReachablePorts(win, 'window', portCtor, 1).filter((path) => path !== 'window'),
    ...(namespace ? findReachablePorts(namespace, 'window.napplet', portCtor, options.namespaceDepth ?? 4) : []),
  ];

  return {
    present: namespace !== null,
    domains,
    invalidKeys,
    malformedNames,
    reachablePorts: Array.from(new Set(reachablePorts)),
  };
}

/** Which of the manifest's declared domains the shell actually exposes. */
export function checkDeclaredDomains(
  inspection: Pick<NamespaceInspection, 'domains'>,
  declared: readonly string[],
): { present: string[]; missing: string[] } {
  const exposed = new Set(inspection.domains);
  const present = declared.filter((domain) => exposed.has(domain));
  const missing = declared.filter((domain) => !exposed.has(domain));
  return { present, missing };
}
