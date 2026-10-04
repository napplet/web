/** Section motion explains composition without making content depend on JavaScript. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Install one-shot, reduced-motion-aware animations on the ecosystem homepage.
 * @returns A function that restores the page's original styles and removes triggers.
 * @example
 * const cleanup = initShowcaseAnimations();
 */
export function initShowcaseAnimations(): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    // App tiles settle into their shared shell. The connector lines show their relationship.
    gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })
      .from('.hero-copy > *', { y: 18, opacity: 0.55, stagger: 0.07, clearProps: 'transform,opacity' })
      .from('.composition-app', { y: '-=26', rotation: 0, stagger: 0.1, clearProps: 'transform' }, 0.15)
      .from('.composition-paths i', { scaleY: 0, stagger: 0.1 }, 0.4)
      .from('.composition-shell', { y: 15, scale: 0.97, clearProps: 'transform' }, 0.55);

    document.querySelectorAll<HTMLElement>('.scene:not(.hero-scene)').forEach(section => {
      const heading = section.querySelector('.section-heading') ?? section.querySelector('h2');
      if (heading) gsap.from(heading, {
        y: 24, duration: 0.75, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
      });

      // Trigger each card independently so long mobile sections remain immediately readable.
      section.querySelectorAll<HTMLElement>('[data-card], [data-shell-card], [data-tool-row]').forEach(card => {
        const isTool = card.hasAttribute('data-tool-row');
        gsap.from(card, {
          y: isTool ? 0 : 24, x: isTool ? 12 : 0,
          duration: 0.75, ease: 'power3.out', clearProps: 'transform',
          scrollTrigger: { trigger: card, start: 'top 92%', once: true },
        });
      });

      if (section.id === 'protocol') {
        gsap.timeline({ scrollTrigger: { trigger: '.protocol-stack', start: 'top 85%', once: true }, defaults: { ease: 'power3.out', duration: 0.55 } })
          .from('.protocol-layer', { x: 12, stagger: 0.15, clearProps: 'transform' })
          .from('.stack-connector i', { scaleY: 0, stagger: 0.15 }, 0.15);
      }
      if (section.id === 'shells') {
        // Reveal each real workspace inside its shell frame.
        section.querySelectorAll<HTMLElement>('.shell-preview').forEach(shell => {
          gsap.from(shell.querySelectorAll('img'), {
            y: 18, scale: 0.96, duration: 0.7,
            ease: 'power3.out', clearProps: 'transform',
            scrollTrigger: { trigger: shell, start: 'top 85%', once: true },
          });
        });
      }
    });
  });

  let active = true;
  void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh, { once: true });
  const cleanup = () => {
    active = false;
    window.removeEventListener('load', refresh);
    media.revert();
  };
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  return cleanup;
}
