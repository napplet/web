/**
 * @napplet/sdk -- Keyboard action and read-only identity wrapper objects.
 *
 * @packageDocumentation
 */

import type { NappletGlobal, Subscription } from '@napplet/core';
import { requireDomain } from './require-napplet.js';

type SdkDomain<K extends keyof NappletGlobal> = NonNullable<NappletGlobal[K]>;

interface KeysSdk extends SdkDomain<'keys'> {
  register(
    action: { id: string; label: string; defaultKey?: string },
    handler: () => void,
  ): Promise<{ actionId: string; binding?: string; close: () => void }>;
}

/**
 * Keyboard forwarding and action keybindings: register named actions the shell
 * can bind to keys, listen for shell-triggered actions locally.
 *
 * @example
 * ```ts
 * import { keys } from '@napplet/sdk';
 *
 * const result = await keys.registerAction({
 *   id: 'editor.save',
 *   label: 'Save',
 *   defaultKey: 'Ctrl+S',
 * });
 *
 * const sub = keys.onAction('editor.save', () => {
 *   console.log('Save triggered!');
 * });
 * ```
 */
export const keys: KeysSdk = {
  /**
   * Declare a named action that the shell can bind to a key.
   * @param action  The action to register (id, label, optional defaultKey)
   * @returns The assigned binding, if any
   */
  registerAction(action: {
    id: string;
    label: string;
    defaultKey?: string;
  }): Promise<{ actionId: string; binding?: string }> {
    return requireDomain('keys').registerAction(action);
  },

  /**
   * Remove a previously registered action.
   * @param actionId  The action to unregister
   */
  unregisterAction(actionId: string): void {
    requireDomain('keys').unregisterAction(actionId);
  },

  /**
   * Register a local handler for when a bound key is pressed.
   * @param actionId  The action to listen for
   * @param callback  Called when the action is triggered
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(actionId: string, callback: () => void): Subscription {
    return requireDomain('keys').onAction(actionId, callback);
  },

  /**
   * Convenience: register a named action AND wire a local handler in one call.
   * Returns a handle whose `close()` both unregisters the action and removes
   * the onAction listener.
   *
   * @param action   The action to register (id, label, optional defaultKey)
   * @param handler  Called when the shell triggers this action
   * @returns The assigned binding plus a `close()` teardown function
   *
   * @example
   * ```ts
   * import { keys } from '@napplet/sdk';
   *
   * const handle = await keys.register(
   *   { id: 'editor.save', label: 'Save', defaultKey: 'Ctrl+S' },
   *   () => saveDocument(),
   * );
   *
   * // Later, tear down both registration and listener:
   * handle.close();
   * ```
   */
  async register(
    action: { id: string; label: string; defaultKey?: string },
    handler: () => void,
  ): Promise<{ actionId: string; binding?: string; close: () => void }> {
    const n = requireDomain('keys');
    const result = await n.registerAction(action);
    const sub = n.onAction(action.id, handler);
    return {
      ...result,
      close() {
        sub.close();
        n.unregisterAction(action.id);
      },
    };
  },
};

/**
 * Read-only user identity queries: public key, profile, follows, relays,
 * lists, zaps, mutes, blocked, badges.
 *
 * @example
 * ```ts
 * import { identity } from '@napplet/sdk';
 *
 * const pubkey = await identity.getPublicKey();
 * const profile = await identity.getProfile();
 * const follows = await identity.getFollows();
 * ```
 */
export const identity: SdkDomain<'identity'> = {
  /**
   * Get the user's hex-encoded public key. Always succeeds.
   * @returns Hex-encoded public key string
   */
  getPublicKey(): Promise<string> {
    return requireDomain('identity').getPublicKey();
  },

  /**
   * Listen for shell-pushed user identity changes.
   * @param handler  Called with a hex pubkey, or "" when no user/signer is connected
   * @returns Subscription with close() to detach the handler
   */
  onChanged(handler: (pubkey: string) => void): Subscription {
    return requireDomain('identity').onChanged(handler);
  },

  /**
   * Get the user's relay list (NIP-65).
   * @returns Record mapping relay URLs to read/write permissions
   */
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>> {
    return requireDomain('identity').getRelays();
  },

  /**
   * Get the user's profile metadata (kind 0).
   * @returns Profile data, or null if not found
   */
  getProfile(): Promise<{
    name?: string;
    displayName?: string;
    about?: string;
    picture?: string;
    banner?: string;
    nip05?: string;
    lud16?: string;
    website?: string;
  } | null> {
    return requireDomain('identity').getProfile();
  },

  /**
   * Get the user's follow list (kind 3 contact list).
   * @returns Array of hex-encoded public keys
   */
  getFollows(): Promise<string[]> {
    return requireDomain('identity').getFollows();
  },

  /**
   * Get entries from a user's categorized list.
   * @param listType  List category (e.g., "bookmarks", "interests", "pins")
   * @returns Array of list entry values
   */
  getList(listType: string): Promise<string[]> {
    return requireDomain('identity').getList(listType);
  },

  /**
   * Get zap receipts sent to the user.
   * @returns Array of zap receipt objects
   */
  getZaps(): Promise<{
    eventId: string;
    sender: string;
    amount: number;
    content?: string;
  }[]> {
    return requireDomain('identity').getZaps();
  },

  /**
   * Get the user's mute list (kind 10000).
   * @returns Array of hex-encoded muted public keys
   */
  getMutes(): Promise<string[]> {
    return requireDomain('identity').getMutes();
  },

  /**
   * Get the user's block list.
   * @returns Array of hex-encoded blocked public keys
   */
  getBlocked(): Promise<string[]> {
    return requireDomain('identity').getBlocked();
  },

  /**
   * Get badges awarded to the user (NIP-58).
   * @returns Array of badge objects
   */
  getBadges(): Promise<{
    id: string;
    name?: string;
    description?: string;
    image?: string;
    thumbs?: string[];
    awardedBy: string;
  }[]> {
    return requireDomain('identity').getBadges();
  },
};
