import type { BlossomBlobCheckResult, BlossomCheckResult, BlossomListResult, BlossomServerListResult } from '@napplet/core';

/** The conformance fixture has no network adapter or shell-user signer. */
export function blossomEndpointResponse(env: Record<string, unknown>): unknown[] {
  const request = env.request as Record<string, unknown>;
  const error = request.auth === 'required' ? 'not-signed-in' : 'unsupported';
  const failure: BlossomCheckResult = { ok: false, status: 0, error };
  let result: BlossomCheckResult | BlossomBlobCheckResult | BlossomListResult = failure;
  if (env.type === 'blossom.check') result = { ...failure, headers: {} };
  if (env.type === 'blossom.list') result = { ...failure, blobs: [] };
  return [{ type: `${String(env.type)}.result`, id: env.id, result }];
}

/** Never invent a preferred list or claim a kind-10063 publication happened. */
export function blossomServerListResponse(env: Record<string, unknown>): unknown[] {
  const result: BlossomServerListResult = {
    ok: false,
    servers: [],
    error: env.type === 'blossom.servers' ? 'server-list-unavailable' : 'not-signed-in',
  };
  return [{ type: `${String(env.type)}.result`, id: env.id, result }];
}
