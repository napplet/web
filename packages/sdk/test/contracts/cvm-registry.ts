import type { NappletGlobal, CvmRegistrySelector as CoreSelector } from '@napplet/core';
import type { CvmRegistrySelector as NapSelector } from '@napplet/nap/cvm';
import type { CvmRegistryHasMessage, CvmRegistryDescribeMessage, CvmRegistryCallMessage, CvmRegistryEntry, CvmRegistryTool } from '@napplet/nap/cvm/types';
import { registry } from '@napplet/nap/cvm/shim';
import { cvmRegistryHas as napHas, cvmRegistryDescribe as napDescribe, cvmRegistryCall as napCall } from '@napplet/nap/cvm/sdk';
import { cvm, cvmRegistryHas, cvmRegistryDescribe, cvmRegistryCall, type CvmRegistrySelector } from '@napplet/sdk';

const selector: CvmRegistrySelector = { family: 'example.rooms.v1' };
const coreSelector: CoreSelector = selector;
const napSelector: NapSelector = coreSelector;
// Regression for the exact public import and envelope reported in #336.
const probe: CvmRegistryHasMessage = { type: 'cvm.registry.has', id: 'probe', selector: napSelector };
const describe: CvmRegistryDescribeMessage = { type: 'cvm.registry.describe', id: 'describe', selector };
const call: CvmRegistryCallMessage = { type: 'cvm.registry.call', id: 'call', selector, tool: 'search_profiles' };
const schemaHash = '088b807239ac8fc469b9228025cb93269cfc3e40c7522141014ac66e348a138f';
const tool: CvmRegistryTool = { name: 'search_profiles', inputSchema: { type: 'object' }, schemaHash };
const entry: CvmRegistryEntry = { schemaHashes: [schemaHash], tools: [tool] };
declare const injected: NonNullable<NappletGlobal['cvm']>;
for (const api of [injected.registry, cvm.registry, registry]) {
  api.list({ category: 'profiles' });
  api.has(selector);
  api.describe({ schemaHash });
  api.call({ family: 'a-local-label', schemaHash }, tool.name);
  // @ts-expect-error Selectors need at least one identity field.
  api.has({});
  // @ts-expect-error String-family arguments were replaced by selectors.
  api.has('relatr');
  // @ts-expect-error Hash pins belong in the selector, not options.
  api.call(selector, tool.name, {}, { schemaHash });
}
for (const has of [cvmRegistryHas, napHas]) has(selector);
for (const describe of [cvmRegistryDescribe, napDescribe]) describe({ schemaHash });
for (const call of [cvmRegistryCall, napCall]) call({ schemaHash }, tool.name);
// @ts-expect-error Legacy family carriers are not the wire contract.
const legacy: CvmRegistryHasMessage = { type: 'cvm.registry.has', id: 'old', family: 'relatr' };
// @ts-expect-error A returned tool always carries its verified hash.
const missingHash: CvmRegistryTool = { name: 'search_profiles', inputSchema: { type: 'object' } };
// @ts-expect-error Returned entries require the set of tool hashes.
const missingHashes: CvmRegistryEntry = { tools: [tool] };
void [probe, describe, call, entry, legacy, missingHash, missingHashes];
