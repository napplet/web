import { describe, expect, it } from 'vitest';
import { getRegisteredDomains } from '@napplet/core';
import {
  DOMAIN as INC_DOMAIN,
  emit,
  handleIncEvent,
  incEmit,
  incOn,
  installIncShim,
  on,
} from './inc/index.js';
import {
  DOMAIN as IFC_DOMAIN,
  handleIfcEvent,
  ifcEmit,
  ifcOn,
  installIfcShim,
} from './ifc/index.js';

describe('deprecated IFC compatibility wrapper', () => {
  it('forwards to the canonical INC exports without registering an ifc domain', () => {
    expect(INC_DOMAIN).toBe('inc');
    expect(IFC_DOMAIN).toBe('inc');
    expect(installIfcShim).toBe(installIncShim);
    expect(handleIfcEvent).toBe(handleIncEvent);
    expect(ifcEmit).toBe(incEmit);
    expect(ifcOn).toBe(incOn);

    const domains = getRegisteredDomains();
    expect(domains).toContain('inc');
    expect(domains).not.toContain('ifc');
  });

  it('keeps the old shim subpath as an alias to inc emit/on functions', async () => {
    const ifcShim = await import('./ifc/shim.js');
    const incShim = await import('./inc/shim.js');

    expect(ifcShim.emit).toBe(emit);
    expect(ifcShim.emit).toBe(incShim.emit);
    expect(ifcShim.on).toBe(on);
    expect(ifcShim.on).toBe(incShim.on);
  });
});
