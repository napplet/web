// Svelte action: add the `in` class when the element scrolls into view, so
// `.reveal` content animates up once. No-op under reduced-motion (CSS handles
// the visible fallback) and degrades gracefully without IntersectionObserver.

export function reveal(node: HTMLElement, options: { delay?: number } = {}) {
  if (typeof IntersectionObserver === 'undefined') {
    node.classList.add('in');
    return {};
  }

  if (options.delay) {
    node.style.transitionDelay = `${options.delay}ms`;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          node.classList.add('in');
          observer.unobserve(node);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );

  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    },
  };
}
