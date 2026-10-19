/** Motion follows an app from independent artifact to hosted experience to building block. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Animate the homepage without making its reading path depend on motion.
 * @returns Cleanup for all page-owned animations and listeners.
 * @example
 * const cleanup = initShowcaseAnimations();
 */
export function initShowcaseAnimations(): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const source = document.querySelector<HTMLElement>('.object-app');
    const dock = document.querySelector<HTMLElement>('.journey-frame');
    const traveler = document.querySelector<HTMLElement>('.journey-traveler');
    if (source && dock && traveler) {
      // One app leaves the opening illustration and stays beside the reading path.
      // Measurements come from static anchors so refresh and deep links agree.
      const origin = () => {
        const box = source.getBoundingClientRect();
        return { x: box.left, y: box.top + window.scrollY, scale: box.width / 130 };
      };
      gsap.set([source, dock], { opacity: 0 });
      gsap.set(traveler, { display: 'block' });
      gsap.fromTo(traveler, {
        x: () => origin().x, y: () => origin().y, scale: () => origin().scale,
      }, {
        x: () => dock.getBoundingClientRect().left,
        y: () => dock.getBoundingClientRect().top,
        scale: () => dock.offsetWidth / 130,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 35%', scrub: .4, invalidateOnRefresh: true },
      });
    }
    gsap.to('.journey-progress', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true } });

    const labels = ['APP / 00', 'PLAY / 01', 'HOST / 02', 'CONNECT / 03', 'MAKE / 04'];
    const label = document.querySelector('.journey-label');
    document.querySelectorAll<HTMLElement>('main > .scene').forEach((section, index) => {
      ScrollTrigger.create({ trigger: section, start: 'top center', end: 'bottom center', onToggle: self => {
        if (self.isActive) {
          if (label) label.textContent = labels[index];
          if (traveler) traveler.dataset.chapter = section.id;
        }
      } });
      if (section.id === 'napplets') {
        section.querySelectorAll('.napplet-preview').forEach(preview => {
          gsap.from(preview.querySelector('img'), { scale: 1.08, duration: 1.1, ease: 'power2.out', scrollTrigger: { trigger: preview, start: 'top 85%', once: true } });
        });
      }
      if (section.id === 'shells') {
        section.querySelectorAll('.shell-preview').forEach(shell => {
          gsap.from(shell.querySelector('img'), { scale: .93, y: 12, duration: .9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: shell, start: 'top 85%', once: true } });
        });
      }
      if (section.id === 'protocol') {
        gsap.from('.protocol-layer', { x: 24, stagger: .16, duration: .8, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: '.protocol-stack', start: 'top 85%', once: true } });
      }
      if (section.id === 'build') {
        section.querySelectorAll('.build-path').forEach(path => {
          gsap.from(path.querySelector('.path-number'), { y: 16, duration: .7, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: path, start: 'top 88%', once: true } });
        });
      }
    });
    return () => { if (label) label.textContent = 'APP / 00'; if (traveler) delete traveler.dataset.chapter; };
  });
  let active = true;
  void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh, { once: true });
  const cleanup = () => { active = false; window.removeEventListener('load', refresh); media.revert(); };
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  return cleanup;
}
