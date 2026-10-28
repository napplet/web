/** The app opens a collection, changes hosts, connects to services, and becomes a canvas. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Enhance static section illustrations with reversible, scroll-linked choreography.
 * @returns Cleanup for the page's timelines, measurements, and listeners.
 * @example const cleanup = initShowcaseAnimations();
 */
export function initShowcaseAnimations(): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 761px)' }, context => {
    if (!context.conditions?.motion) return;
    const traveler = document.querySelector<HTMLElement>('.journey-traveler');
    const docks = [...document.querySelectorAll<HTMLElement>('[data-app-dock]')];
    let travel: gsap.core.Timeline | undefined;
    // Read only static anchors, including their CSS scale. Rebuild after a layout refresh.
    const placeTraveler = () => {
      travel?.scrollTrigger?.kill();
      travel?.kill();
      if (!traveler || !context.conditions?.desktop || docks.length < 2) return;
      const maximum = ScrollTrigger.maxScroll(window);
      const points = docks.map(dock => {
        const box = dock.getBoundingClientRect();
        const y = box.top + window.scrollY;
        return { x: box.left, y, scale: box.width / 230, at: Math.max(0, Math.min(maximum, y + box.height / 2 - innerHeight * .55)) };
      });
      gsap.set(docks.map(dock => dock.firstElementChild), { opacity: 0 });
      gsap.set(traveler, { display: 'block', x: points[0].x, y: points[0].y, scale: points[0].scale });
      travel = gsap.timeline({ defaults: { ease: 'power1.inOut' }, scrollTrigger: {
        trigger: 'main', start: 0, end: maximum, scrub: .45, id: 'app-journey',
      } });
      points.slice(1).forEach((point, index) => {
        const previous = points[index];
        const departure = Math.max(previous.at, point.at - 430);
        travel!.to(traveler, { x: point.x, y: point.y, scale: point.scale, duration: Math.max(1, point.at - departure) }, departure);
      });
      // Hold the final destination to the end of the page, preserving reverse scrolling.
      travel.to({}, { duration: Math.max(1, maximum - points.at(-1)!.at) });
      travel.scrollTrigger?.refresh();
    };
    placeTraveler();
    const onRefresh = () => placeTraveler();
    if (context.conditions.desktop) ScrollTrigger.addEventListener('refreshInit', onRefresh);

    animateSectionScenes();

    // Content reveals follow the app's entrance into each setting.
    for (const selector of ['.napplet-card', '.shell-row', '.protocol-layer', '.build-path']) {
      ScrollTrigger.batch(selector, { start: 'top 94%', once: true, onEnter: elements => {
        gsap.from(elements, { y: 30, opacity: .25, stagger: .07, duration: .7, ease: 'power3.out', clearProps: 'transform,opacity' });
      } });
    }
    if (!context.conditions.desktop) {
      docks.forEach(dock => gsap.from(dock.firstElementChild, { y: 35, rotation: -7, scale: .9, scrollTrigger: { trigger: dock, start: 'top 90%', end: 'bottom 55%', scrub: .5 } }));
    }
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', onRefresh);
      travel?.scrollTrigger?.kill();
      travel?.revert();
    };
  });
  let active = true;
  void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh, { once: true });
  const cleanup = () => { active = false; window.removeEventListener('load', refresh); media.revert(); };
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  return cleanup;
}

/** Coordinate each setting with the app’s arrival. Called inside the media context. */
function animateSectionScenes(): void {
    gsap.to('.chapter-progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true } });
    gsap.timeline({ scrollTrigger: { trigger: '.hero-lab', start: 'top 85%', end: 'bottom top', scrub: .6 } })
      .fromTo('.orbit-a', { rotation: -28 }, { rotation: 8, duration: 1 }, 0)
      .fromTo('.orbit-b', { rotation: 28 }, { rotation: -8, duration: 1 }, 0)
      .fromTo('.host-label', { y: 12 }, { y: -18, stagger: .08, duration: 1 }, 0);

    gsap.timeline({ scrollTrigger: { trigger: '.collection-reveal', start: 'top 90%', end: 'bottom 45%', scrub: .5 }, defaults: { ease: 'power3.out' } })
      .from('.collection-word', { yPercent: 60, opacity: .15, duration: 1 }, 0)
      .from('.ticket-a', { x: 135, rotation: 0, opacity: 0, duration: .8 }, .12)
      .from('.ticket-b', { x: -135, rotation: 0, opacity: 0, duration: .8 }, .22)
      .from('.collection-rule', { scaleY: 0, transformOrigin: 'top', duration: .4 }, .55);

    gsap.timeline({ scrollTrigger: { trigger: '.host-theatre', start: 'top 90%', end: 'bottom 50%', scrub: .5 } })
      .from('.host-desktop', { clipPath: 'inset(0 100% 0 0)', x: -25, duration: .7 }, 0)
      .from('.desktop-sidebar i', { x: -12, opacity: 0, stagger: .08, duration: .4 }, .25)
      .from('.host-phone', { y: 85, rotation: 12, opacity: 0, duration: .7 }, .35)
      .from('.host-annotation span', { y: 15, opacity: 0, stagger: .15, duration: .4 }, .6);

    gsap.timeline({ scrollTrigger: { trigger: '.capability-stage', start: 'top 85%', end: 'bottom 45%', scrub: .5 } })
      .from('.capability-ring', { scale: .35, rotation: -40, opacity: 0, duration: 1 }, 0)
      .from('.capability-wires path', { strokeDashoffset: 1, stagger: .16, duration: .5 }, .15)
      .from('.capability-port', { scale: .5, opacity: 0, y: 30, stagger: .18, duration: .6, ease: 'back.out(1.4)' }, .15)
      .from('.capability-caption', { y: 14, opacity: 0, duration: .4 }, .7);

    gsap.timeline({ scrollTrigger: { trigger: '.builder-stage', start: 'top 85%', end: 'bottom 50%', scrub: .5 } })
      .from('.blueprint-lines', { scale: 1.3, opacity: 0, duration: 1 }, 0)
      .from('.bracket-left', { x: 100, opacity: 0, duration: .8 }, .1)
      .from('.bracket-right', { x: -100, opacity: 0, duration: .8 }, .1)
      .to('.journey-traveler .app-picture img, .journey-traveler .app-name', { opacity: 0, duration: .5 }, .2)
      .to('.journey-traveler .app-blueprint, .journey-traveler .app-new-name', { opacity: 1, duration: .5 }, .4)
      .from('.builder-prompt', { y: 20, opacity: 0, duration: .5 }, .6);

}
