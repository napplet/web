// NIP-5D §Transport: napplets have no access to browser storage; everything
// is proxied through the shell. These probes reach for each API directly.

import { expectDenied } from './helpers';
import { defineProbes, type ProbeDefinition } from './types';

export const storageProbes: ProbeDefinition[] = defineProbes(
  { level: 'baseline', category: 'Storage', ownerArea: 'sandbox', spec: 'Transport (no storage access)', severity: 'high', expectedResult: 'denied' },
  [
    {
      id: 'storage.local',
      probe: 'Direct localStorage access',
      expected: 'localStorage is unavailable in the opaque-origin iframe',
      run: () => expectDenied(() => localStorage.setItem('napplet-lab-direct', '1')),
    },
    {
      id: 'storage.session',
      probe: 'Direct sessionStorage access',
      expected: 'sessionStorage is unavailable in the opaque-origin iframe',
      run: () => expectDenied(() => sessionStorage.setItem('napplet-lab-direct', '1')),
    },
    {
      id: 'storage.cookie',
      probe: 'Direct document.cookie access',
      expected: 'Cookies are unreadable and unwritable from an opaque origin',
      severity: 'medium',
      run: () => expectDenied(() => {
        document.cookie = 'napplet-lab=1';
        return `cookie=${document.cookie}`;
      }),
    },
    {
      id: 'storage.indexeddb',
      probe: 'Direct indexedDB.open()',
      expected: 'IndexedDB is denied or unusable in the opaque-origin iframe',
      run: () => expectDenied(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('napplet-lab-direct');
        request.onsuccess = () => resolve('indexedDB opened');
        request.onerror = () => reject(request.error ?? new Error('indexedDB error'));
        request.onblocked = () => reject(new Error('indexedDB blocked'));
      })),
    },
    {
      id: 'storage.cache',
      probe: 'Cache Storage',
      expected: 'caches.open() is denied for an opaque origin',
      severity: 'medium',
      run: () => expectDenied(() => caches.open('napplet-lab-direct')),
    },
    {
      id: 'storage.serviceworker',
      probe: 'Service worker registration',
      expected: 'Service workers cannot be registered from the sandbox',
      spec: 'Security Considerations §1',
      run: () => expectDenied(() => navigator.serviceWorker.register('/napplet-lab-sw.js')),
    },
  ],
);
