# NOTIFY

Shell-rendered notifications, badges, and interaction callbacks.

```ts
const { notificationId } = await window.napplet.notify.send({ title: 'New message', body: 'Alice: hey!' });
window.napplet.notify.badge(3);
window.napplet.notify.onAction((id, actionId) => { if (actionId === 'reply') openReply(id); });
```

This non-normative guide defers to the living [NAP-NOTIFY proposal](https://github.com/napplet/naps/pull/11). Feature-gate with `if (window.napplet?.notify)` before use; the runtime injects only available domains. Typed helpers ship from [`@napplet/nap/notify`](/packages/nap) and [`@napplet/sdk`](/packages/sdk).
