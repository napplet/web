import { mount } from 'svelte';
import { themeGet, themeOnChanged } from '@napplet/sdk';
import App from './App.svelte';
import { applyTheme } from './lib/theme';

// NAP-THEME over the NAP port. A shell without the theme domain leaves the
// fallback palette in place; nothing here ever touches window-level messaging,
// which NIP-5D reserves for the single napplet.hello handoff.
function installTheme(): void {
  const root = document.documentElement;
  try {
    void themeGet().then((theme) => applyTheme(theme, root)).catch(() => undefined);
  } catch {
    // theme domain absent
  }
  try {
    themeOnChanged((theme) => applyTheme(theme, root));
  } catch {
    // theme domain absent
  }
}

installTheme();

const app = mount(App, { target: document.getElementById('app')! });
export default app;
