/** Public platform-neutral build-tool contracts. */

export { RedactedSecret } from "./contracts.ts";
export { createBuildSigner } from "./signer.ts";
export { createPlatformSecretStore } from "./secret-store.ts";
export { BUILD_SIGNER_SESSION_KEY, pairBuildSigner, reconnectBuildSigner } from "./terminal.ts";
export { discoverBlossomServers, DEFAULT_DIRECTORY_RELAYS } from "./discovery.ts";
export { decodeBuildSignerSecret, encodeBuildSignerSecret } from "./session-secret.ts";
export type { BuildSignerSecret } from "./session-secret.ts";
export { createNetworkPolicy } from "./network-policy.ts";
export { headBlob, uploadBlob, uploadExactBlobs } from "./blossom.ts";
export type {
  BuildSigner,
  BuildSignerServices,
  BuildSignerSession,
  Clock,
  FileSystemAdapter,
  Nip46Request,
  Nip46Response,
  ProcessAdapter,
  ProcessArgument,
  ProcessResult,
  RelayClient,
  RelayRequest,
  SafeLogger,
  SafeStatus,
  SecretStore,
  SignedEvent,
  TerminalAdapter,
  UnsignedEvent,
} from "./contracts.ts";
export type { PlatformSecretStoreOptions } from "./secret-store.ts";
export type {
  PairBuildSignerOptions,
  QrPairing,
  ReconnectBuildSignerOptions,
  StoredSessionIdentity,
} from "./terminal.ts";
export type {
  BlossomDiscoveryInput,
  BlossomDiscoveryResult,
  DiscoveryFilter,
  DiscoveryServices,
  VerifiedEvent,
} from "./discovery.ts";
export type {
  NetworkPolicy,
  NetworkPolicyOptions,
  PublicAddressResolver,
  ValidatedEndpoint,
} from "./network-policy.ts";
export type {
  BlobDescriptor,
  BlossomServices,
  UploadBatchInput,
  UploadBatchResult,
  UploadBlob,
  UploadEvidence,
  VerifiedBlobDescriptor,
} from "./blossom.ts";
