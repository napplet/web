/**
 * @napplet/nap/lists -- SDK helpers wrapping window.napplet.lists.
 */

import type {
  ListItem,
  ListMutationResult,
  ListOptions,
  ListRef,
  ListSupport,
  NappletGlobal,
} from '@napplet/core';

function requireLists(): NonNullable<NappletGlobal['lists']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.lists) {
    throw new Error('window.napplet.lists is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.lists;
}

/**
 * Return the NIP-51 list kinds/types this runtime supports.
 *
 * @returns Promise resolving to supported list descriptions.
 */
export function listsSupported(): Promise<ListSupport[]> {
  return requireLists().supported();
}

/**
 * Add items to a runtime-supported NIP-51 list.
 *
 * @param list     List reference by kind or derived type.
 * @param items    Items to add.
 * @param options  Optional create/metadata hints.
 * @returns Promise resolving to the mutation result.
 */
export function listsAdd(
  list: ListRef,
  items: ListItem[],
  options?: ListOptions,
): Promise<ListMutationResult> {
  return requireLists().add(list, items, options);
}

/**
 * Remove items from a runtime-supported NIP-51 list.
 *
 * @param list     List reference by kind or derived type.
 * @param items    Items to remove.
 * @param options  Optional runtime hints.
 * @returns Promise resolving to the mutation result.
 */
export function listsRemove(
  list: ListRef,
  items: ListItem[],
  options?: ListOptions,
): Promise<ListMutationResult> {
  return requireLists().remove(list, items, options);
}
