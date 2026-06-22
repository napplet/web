/** Health status values reported by NAP-SYSTEM snapshots. */
export type SystemHealth = 'ok' | 'degraded' | 'unavailable' | 'unknown';

/** NAP support visible to the requesting napplet. */
export interface SystemNapStatus {
  domain: string;
  supported: boolean;
  required?: boolean;
  protocols?: string[];
  health?: SystemHealth;
}

/** Runtime-defined service availability and health. */
export interface SystemServiceStatus {
  name: string;
  available: boolean;
  health: SystemHealth;
  message?: string;
}

/** Connected relay transport status. */
export interface SystemRelayStatus {
  url: string;
  read: boolean;
  write: boolean;
  connected: boolean;
  health: SystemHealth;
  latencyMs?: number;
}

/** Storage-like surface status and approximate usage. */
export interface SystemStorageStatus {
  available: boolean;
  health: SystemHealth;
  bytesUsed?: number;
  bytesQuota?: number;
  itemCount?: number;
  persistent?: boolean;
  message?: string;
}

/** Runtime media subsystem status. */
export interface SystemMediaStatus {
  available: boolean;
  health: SystemHealth;
  audioOutput?: SystemHealth;
  audioInput?: SystemHealth;
  videoInput?: SystemHealth;
  playback?: SystemHealth;
  activeSessions?: number;
  message?: string;
}

/** Summary for a napplet-scoped diagnostic area. */
export interface SystemScopeSummary {
  name: string;
  available: boolean;
  health: SystemHealth;
}

/** Runtime-defined details for one napplet-scoped diagnostic area. */
export interface SystemScopeStatus {
  name: string;
  available: boolean;
  health: SystemHealth;
  details: Record<string, unknown>;
}
