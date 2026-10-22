/** A DNS resolver injected by the host runtime. */
export interface PublicAddressResolver {
  /** Resolve a hostname to literal IP addresses without making an HTTP request. */
  resolve(hostname: string, signal: AbortSignal): Promise<readonly string[]>;
}

/** A public HTTPS endpoint that passed a fresh DNS resolution check. */
export interface ValidatedEndpoint {
  /** The normalized endpoint URL. */
  url: URL;
  /** The normalized DNS hostname. */
  hostname: string;
  /** Public IP answers used for this validation. */
  addresses: readonly string[];
}

export interface NetworkPolicy {
  /**
   * Validate one HTTPS endpoint against the injected public-address policy.
   *
   * @param url - Endpoint URL to resolve and validate.
   * @param signal - Cancels resolution before an outbound HTTP operation starts.
   * @returns The normalized endpoint and its verified public DNS answers.
   */
  validate(url: URL, signal: AbortSignal): Promise<ValidatedEndpoint>;
}

/** Configuration for non-normative public HTTPS endpoint hardening. */
export interface NetworkPolicyOptions {
  /** Injected resolver so Node and Deno own DNS integration. */
  resolve?: PublicAddressResolver["resolve"];
  /** Maximum accepted URL length; defaults to 2048 characters. */
  maxUrlLength?: number;
  /** Maximum accepted DNS answers; defaults to 8. */
  maxDnsAnswers?: number;
}

const DEFAULT_MAX_URL_LENGTH = 2_048;
const DEFAULT_MAX_DNS_ANSWERS = 8;

/**
 * Create the build-tool-only policy that permits public HTTPS origins.
 *
 * @param options - Injected DNS resolution and explicit safety bounds.
 * @returns A policy that re-resolves every endpoint, including redirect targets.
 * @example
 * ```ts
 * const policy = createNetworkPolicy({ resolve });
 * const endpoint = await policy.validate(new URL("https://blossom.example"), signal);
 * ```
 */
export function createNetworkPolicy(options: NetworkPolicyOptions = {}): NetworkPolicy {
  const resolve = options.resolve ?? unsupportedResolver;
  const maxUrlLength = options.maxUrlLength ?? DEFAULT_MAX_URL_LENGTH;
  const maxDnsAnswers = options.maxDnsAnswers ?? DEFAULT_MAX_DNS_ANSWERS;

  return {
    async validate(url: URL, signal: AbortSignal): Promise<ValidatedEndpoint> {
      if (signal.aborted) throw abortError();
      if (!isSafeUrlForm(url, maxUrlLength)) throw unsafeEndpointError();
      const hostname = url.hostname.toLowerCase();
      if (isIpLiteral(hostname) || isLocalName(hostname)) throw unsafeEndpointError();
      const answers = await resolve(hostname, signal);
      if (signal.aborted) throw abortError();
      if (!Array.isArray(answers) || answers.length === 0 || answers.length > maxDnsAnswers) {
        throw unsafeEndpointError();
      }
      const normalizedAnswers = answers.map((address) => address.trim());
      if (normalizedAnswers.some((address) => !isPublicAddress(address))) throw unsafeEndpointError();
      return { url: new URL(url.toString()), hostname, addresses: normalizedAnswers };
    },
  };
}

async function unsupportedResolver(): Promise<readonly string[]> {
  throw new Error("A public DNS resolver is required for Blossom network access");
}

function isSafeUrlForm(url: URL, maxUrlLength: number): boolean {
  return url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.hash === "" &&
    url.toString().length <= maxUrlLength;
}

function isLocalName(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function isIpLiteral(hostname: string): boolean {
  return isIpv4(hostname) || hostname.includes(":");
}

function isPublicAddress(address: string): boolean {
  if (isIpv4(address)) return isPublicIpv4(address);
  if (address.includes(":")) return isPublicIpv6(address);
  return false;
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isPublicIpv4(value: string): boolean {
  const [a, b] = value.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168)) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
  if (a === 203 && b === 0) return false;
  return true;
}

function isPublicIpv6(value: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("::ffff:")) return false;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized.startsWith("ff") || normalized.startsWith("2001:db8")) return false;
  return /^[0-9a-f:]+$/.test(normalized);
}

function unsafeEndpointError(): Error {
  return new Error("unsafe endpoint rejected by non-normative build policy");
}

function abortError(): Error {
  return new Error("network operation cancelled");
}
