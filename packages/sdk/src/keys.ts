/**
 * @napplet/sdk -- Keyboard action and read-only identity wrapper objects.
 *
 * @packageDocumentation
 */

import type { Subscription } from '@napplet/core';
import { requireNapplet } from './require-napplet.js';

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
export const keys = {
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
    return requireNapplet().keys.registerAction(action);
  },

  /**
   * Remove a previously registered action.
   * @param actionId  The action to unregister
   */
  unregisterAction(actionId: string): void {
    requireNapplet().keys.unregisterAction(actionId);
  },

  /**
   * Register a local handler for when a bound key is pressed.
   * @param actionId  The action to listen for
   * @param callback  Called when the action is triggered
   * @returns A Subscription with `close()` to stop listening
   */
  onAction(actionId: string, callback: () => void): Subscription {
    return requireNapplet().keys.onAction(actionId, callback);
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
    const n = requireNapplet();
    const result = await n.keys.registerAction(action);
    const sub = n.keys.onAction(action.id, handler);
    return {
      ...result,
      close() {
        sub.close();
        n.keys.unregisterAction(action.id);
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
export const identity = {
  /**
   * Get the user's hex-encoded public key. Always succeeds.
   * @returns Hex-encoded public key string
   */
  getPublicKey(): Promise<string> {
    return requireNapplet().identity.getPublicKey();
  },

  /**
   * Listen for shell-pushed user identity changes.
   * @param handler  Called with a hex pubkey, or "" when no user/signer is connected
   * @returns Subscription with close() to detach the handler
   */
  onChanged(handler: (pubkey: string) => void): Subscription {
    return requireNapplet().identity.onChanged(handler);
  },

  /**
   * Get the user's relay list (NIP-65).
   * @returns Record mapping relay URLs to read/write permissions
   */
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>> {
    return requireNapplet().identity.getRelays();
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
    return requireNapplet().identity.getProfile();
  },

  /**
   * Get the user's follow list (kind 3 contact list).
   * @returns Array of hex-encoded public keys
   */
  getFollows(): Promise<string[]> {
    return requireNapplet().identity.getFollows();
  },

  /**
   * Get entries from a user's categorized list.
   * @param listType  List category (e.g., "bookmarks", "interests", "pins")
   * @returns Array of list entry values
   */
  getList(listType: string): Promise<string[]> {
    return requireNapplet().identity.getList(listType);
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
    return requireNapplet().identity.getZaps();
  },

  /**
   * Get the user's mute list (kind 10000).
   * @returns Array of hex-encoded muted public keys
   */
  getMutes(): Promise<string[]> {
    return requireNapplet().identity.getMutes();
  },

  /**
   * Get the user's block list.
   * @returns Array of hex-encoded blocked public keys
   */
  getBlocked(): Promise<string[]> {
    return requireNapplet().identity.getBlocked();
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
    return requireNapplet().identity.getBadges();
  },
};
