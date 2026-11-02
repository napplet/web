import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import './custom.css';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp() {
    // The same WebMCP tools as the rest of napplet.run (docs/guide/agent-access.md); a no-op without a ModelContext.
    if (!import.meta.env.SSR) void import('../../../web/src/lib/agent-tools').then(({ registerAgentTools }) => registerAgentTools());
  },
};

export default theme;
