import { outbox } from '@napplet/sdk';

const app = document.querySelector<HTMLHeadingElement>('#app-title');

async function render(): Promise<void> {
  if (!app) return;
  if (!window.napplet?.outbox) {
    app.dataset.state = 'missing-outbox';
    return;
  }

  const result = await outbox.query([{ kinds: [1], limit: 1 }], { timeoutMs: 1000 });
  app.dataset.events = String(result.events.length);
}

void render();
