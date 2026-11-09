/** The app opens a collection, changes hosts, connects to services, and becomes a canvas. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

/**
 * Enhance static section illustrations with reversible, scroll-linked choreography.
 * @returns Cleanup for the page's timelines, measurements, and listeners.
 * @example const cleanup = initShowcaseAnimations();
 */
export function initShowcaseAnimations(): () => void {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
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
      }).sort((a, b) => a.at - b.at);
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

    animateHero();
    animateCollection();
    animateHosts();
    animateHandshake();
    animateCanvas();

    if (!context.conditions.desktop) {
      docks.forEach(dock => gsap.from(dock.firstElementChild, { y: 35, scale: .92, scrollTrigger: { trigger: dock, start: 'top 90%', end: 'bottom 55%', scrub: .5 } }));
    }

    // The background world is only loaded once motion is allowed and WebGL is available.
    let disposeWorld: (() => void) | undefined;
    let alive = true;
    const probe = document.createElement('canvas');
    const webgl = Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
    if (webgl) {
      void import('./world').then(({ mountWorld }) => {
        if (!alive) return;
        disposeWorld = mountWorld([...document.querySelectorAll<HTMLElement>('main > section')]);
        ScrollTrigger.refresh();
      }).catch(() => { /* the static figures stand on their own */ });
    }
    return () => {
      alive = false;
      disposeWorld?.();
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

/** Hero: a measured figure. The headline rises, then leaders draw out to name each setting. */
function animateHero(): void {
  gsap.to('.chapter-progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true } });
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from('.hero-copy .line-inner', { yPercent: 110, duration: 1.2, stagger: .12 }, .1)
    .from('.hero-copy .eyebrow', { opacity: 0, duration: .6 }, .2)
    .from('.hero-lead, .hero-actions, .hero-copy > .quiet-link', { y: 26, opacity: 0, duration: .9, stagger: .1 }, .55)
    .from('.journey-traveler, .hero-dock', { opacity: 0, duration: .9, ease: 'power2.out' }, .5)
    .from('.host-label .leader', { scaleX: 0, duration: .7, stagger: .2, ease: 'power3.inOut' }, .95)
    .from('.host-label b', { opacity: 0, duration: .5, stagger: .2, ease: 'power2.out' }, 1.3)
    .from('.lab-coordinate, .lab-caption, .hero-baseline', { opacity: 0, duration: .7 }, 1.6);
  // Labels move at slightly different rates as the figure scrolls away.
  gsap.timeline({ scrollTrigger: { trigger: '.hero-lab', start: 'top 80%', end: 'bottom top', scrub: .6 } })
    .fromTo('.host-label', { y: 0 }, { y: -22, stagger: .1, duration: 1, ease: 'none' }, 0);
}

/** Start here: three slots deal out from behind the app, then the real apps wipe in beneath them. */
function animateCollection(): void {
  const stage = document.querySelector<HTMLElement>('.collection-reveal');
  if (!stage) return;
  const centred = (element: Element) => {
    const slot = element as HTMLElement;
    return stage.clientWidth / 2 - (slot.offsetLeft + slot.offsetWidth / 2);
  };
  gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 88%', end: 'bottom 58%', scrub: .5, invalidateOnRefresh: true }, defaults: { ease: 'power3.inOut' } })
    .from('.deal-slot', { x: (_index, element) => centred(element), opacity: 0, duration: .8, stagger: { each: .06, from: 'center' } }, 0)
    .from('.deal-slot span', { opacity: 0, duration: .2 }, .6)
    .from('.deal-slot .drop-line', { scaleY: 0, duration: .35, stagger: .06, ease: 'power2.out' }, .7)
    .from('.collection-caption', { opacity: 0, y: 8, duration: .3 }, .85);
  gsap.timeline({ scrollTrigger: { trigger: '.napplet-grid', start: 'top 82%', toggleActions: 'play none none reverse' }, defaults: { ease: 'power4.out' } })
    .from('.napplet-preview', { clipPath: 'inset(100% 0 0 0)', duration: 1.1, stagger: .14 }, 0)
    .from('.napplet-preview img, .napplet-preview .preview-placeholder', { scale: 1.16, duration: 1.4, stagger: .14, ease: 'power3.out' }, 0)
    .from('.napplet-details', { y: 18, opacity: 0, duration: .8, stagger: .14 }, .35)
    .from('.store-invitation, .napplet-grid ~ .section-note', { opacity: 0, y: 12, duration: .6, stagger: .1 }, .9);
}

/** How it works: the desktop draws and the phone rises; the directory reads as a ledger. */
function animateHosts(): void {
  gsap.timeline({ scrollTrigger: { trigger: '.host-theatre', start: 'top 90%', end: 'bottom 50%', scrub: .5 } })
    .from('.host-desktop', { clipPath: 'inset(0 100% 0 0)', duration: .7, ease: 'power2.inOut' }, 0)
    .from('.host-chrome i', { scale: 0, stagger: .06, duration: .2, ease: 'back.out(2)' }, .3)
    .from('.desktop-sidebar i', { x: -12, opacity: 0, stagger: .08, duration: .4 }, .3)
    .from('.desktop-caption', { opacity: 0, duration: .3 }, .5)
    .from('.host-phone', { clipPath: 'inset(100% 0 0 0)', opacity: 0, duration: .7, ease: 'power2.inOut' }, .4)
    .from('.phone-caption', { opacity: 0, duration: .3 }, .8)
    .from('.host-annotation span', { y: 15, opacity: 0, stagger: .15, duration: .4 }, .65);
  gsap.from('.directory-heading', { opacity: 0, y: 10, duration: .6, scrollTrigger: { trigger: '.directory-heading', start: 'top 90%', toggleActions: 'play none none reverse' } });
  ScrollTrigger.batch('.shell-row', { start: 'top 90%', onEnter: rows => rows.forEach((row, index) => {
    gsap.timeline({ delay: index * .1, defaults: { ease: 'power3.out' } })
      .fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: .9, ease: 'power2.inOut' }, 0)
      .from(row.querySelectorAll('.shell-monogram, .shell-name, p'), { x: -16, opacity: 0, duration: .7, stagger: .08 }, .1)
      .from(row.querySelectorAll('.platforms li'), { scale: .7, opacity: 0, duration: .45, stagger: .05, ease: 'back.out(1.8)' }, .4)
      .from(row.querySelectorAll('.source-link'), { opacity: 0, duration: .4 }, .6);
  }), once: true });
  gsap.from('.directory-note, .shell-build-link', { opacity: 0, y: 10, duration: .6, stagger: .1, scrollTrigger: { trigger: '.directory-note', start: 'top 95%', toggleActions: 'play none none reverse' } });
}

/** Open by design: wires draw from the app, a pulse travels each one, and the service answers. */
function animateHandshake(): void {
  const stage = document.querySelector<HTMLElement>('.capability-stage');
  if (!stage) return;
  const timeline = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 85%', end: 'bottom 40%', scrub: .5, invalidateOnRefresh: true } });
  ['identity', 'storage', 'theme'].forEach((service, index) => {
    const wire = stage.querySelector<SVGPathElement>(`.wire-${service}`);
    const pulse = stage.querySelector<HTMLElement>(`.pulse-${service}`);
    const port = stage.querySelector<HTMLElement>(`.port-${service}`);
    const at = .05 + index * .18;
    if (wire) timeline.from(wire, { strokeDashoffset: 1, duration: .45, ease: 'none' }, at);
    if (wire && pulse) {
      timeline
        .fromTo(pulse, { opacity: 0 }, { opacity: 1, duration: .04 }, at + .08)
        .to(pulse, { motionPath: { path: wire, align: wire, alignOrigin: [.5, .5] }, duration: .4, ease: 'power1.inOut' }, at + .08)
        .to(pulse, { opacity: 0, duration: .06 }, at + .46);
    }
    if (port) {
      timeline
        .from(port, { scale: .85, opacity: 0, y: 12, duration: .3, ease: 'back.out(1.6)' }, at + .4)
        .fromTo(port, { borderColor: '#79538d', backgroundColor: '#1d102c' }, { borderColor: '#b06bff', backgroundColor: '#2a1540', duration: .2, ease: 'none' }, at + .48);
    }
  });
  timeline.from('.capability-caption', { y: 14, opacity: 0, duration: .3 }, .95);
  gsap.timeline({ scrollTrigger: { trigger: '.protocol-grid', start: 'top 80%', toggleActions: 'play none none reverse' }, defaults: { ease: 'power3.out' } })
    .from('.protocol-grid > div:first-child > *', { y: 20, opacity: 0, duration: .8, stagger: .1 }, 0)
    .fromTo('.protocol-layer', { '--rule': 0 }, { '--rule': 1, duration: 1, stagger: .18, ease: 'power2.inOut' }, .1)
    .from('.protocol-layer .layer-index, .protocol-layer > div', { x: -18, opacity: 0, duration: .7, stagger: .09 }, .35)
    .from('.protocol-layer .layer-arrow', { x: -12, opacity: 0, duration: .5, stagger: .18 }, .6)
    .from('.protocol-note', { opacity: 0, duration: .6 }, .9);
}

/** Your part in it: the brackets open outward, the grid reaches the edges, the app becomes a canvas. */
function animateCanvas(): void {
  const stage = document.querySelector<HTMLElement>('.builder-stage');
  if (!stage) return;
  const hug = (element: Element, side: 1 | -1) => {
    const bracket = element as HTMLElement;
    const appEdge = stage.clientWidth / 2 + side * 128;
    const bracketEdge = side > 0 ? bracket.offsetLeft : bracket.offsetLeft + bracket.offsetWidth;
    return appEdge - bracketEdge;
  };
  gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 85%', end: 'bottom 45%', scrub: .5, invalidateOnRefresh: true } })
    .fromTo('.blueprint-lines', { '--reach': '0%' }, { '--reach': '100%', duration: 1, ease: 'power1.inOut' }, 0)
    .from('.blueprint-label', { opacity: 0, x: -10, duration: .3 }, .1)
    .from('.bracket-left', { x: () => hug(stage.querySelector('.bracket-left')!, -1), opacity: 0, duration: .8, ease: 'power3.inOut' }, .1)
    .from('.bracket-right', { x: () => hug(stage.querySelector('.bracket-right')!, 1), opacity: 0, duration: .8, ease: 'power3.inOut' }, .1)
    .to('.journey-traveler .app-picture img, .journey-traveler .app-name', { opacity: 0, duration: .4 }, .3)
    .to('.journey-traveler .app-blueprint, .journey-traveler .app-new-name', { opacity: 1, duration: .4 }, .45)
    .from('.builder-prompt', { y: 20, opacity: 0, duration: .4 }, .7);
  ScrollTrigger.batch('.build-path', { start: 'top 88%', onEnter: paths => paths.forEach((path, index) => {
    gsap.timeline({ delay: index * .12, defaults: { ease: 'power3.out' } })
      .fromTo(path, { '--rule': 0 }, { '--rule': 1, duration: .9, ease: 'power2.inOut' }, 0)
      .from(path.querySelectorAll('.path-number'), { opacity: 0, duration: .4 }, .2)
      .from(path.querySelectorAll('h3'), { clipPath: 'inset(0 100% 0 0)', duration: .9, ease: 'power3.inOut' }, .2)
      .from(path.querySelectorAll('p, .path-links'), { y: 14, opacity: 0, duration: .7, stagger: .1 }, .5);
  }), once: true });
  gsap.from('.build-scene .section-note', { opacity: 0, y: 10, duration: .6, scrollTrigger: { trigger: '.build-scene .section-note', start: 'top 95%', toggleActions: 'play none none reverse' } });
}
