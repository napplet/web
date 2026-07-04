import { outbox } from '@napplet/sdk';

const app = document.querySelector<HTMLHeadingElement>('#app-title');

async function render(): Promise<void> {
  if (!app) return;
  if (!window.napplet?.outbox) {
    app.dataset.state = 'missing-outbox';
    app.textContent = 'Open in a napplet shell to load notes.';
    return;
  }

  const result = await outbox.query([{ kinds: [1], limit: 1 }], { timeoutMs: 1000 });
  app.dataset.events = String(result.events.length);
  app.textContent = result.events.at(0)?.event.content ?? 'No notes yet';
  app.dataset.state = 'ready';
}

void render();
