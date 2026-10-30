/** A field of window frames in depth, behind the page, that forms a new figure for each chapter. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  AdditiveBlending, BufferGeometry, Color, Group, Line, LineBasicMaterial,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';

const FRAME_COUNT = 30;
const FRAME_WIDTH = 2.3;
const FRAME_HEIGHT = 1.9;

interface Pose { x: number; y: number; z: number; rx: number; ry: number; scale: number; alpha: number }

/** Deterministic pseudo-random sequence so the opening field is the same on every visit. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chapter 0, the hero: many places an app could run, scattered in depth. */
function cloud(): Pose[] {
  const random = seeded(5129);
  return Array.from({ length: FRAME_COUNT }, (_, index) => {
    const z = -1 - random() * 14;
    const side = index % 2 ? 1 : -1;
    return {
      x: side * (2.5 + random() * 6.5), y: (random() - .5) * 7.5, z,
      rx: (random() - .5) * .3, ry: (random() - .5) * .5, scale: .55 + random() * .8,
      alpha: .08 + (1 + z / 15) * .2,
    };
  });
}

/** Chapter 1, start here: a wall of windows, the collection to browse. */
function wall(): Pose[] {
  const columns = 10;
  return Array.from({ length: FRAME_COUNT }, (_, index) => ({
    x: ((index % columns) - (columns - 1) / 2) * 3.1,
    y: (Math.floor(index / columns) - 1) * 2.6 - .4, z: -8,
    rx: 0, ry: 0, scale: 1, alpha: .16,
  }));
}

/** Chapter 2, how it works: a corridor of settings the app passes through. */
function corridor(): Pose[] {
  return Array.from({ length: FRAME_COUNT }, (_, index) => {
    const depth = index / (FRAME_COUNT - 1);
    return { x: 0, y: -.2 + depth * .6, z: -1 - depth * 42, rx: 0, ry: 0, scale: 1.4 + depth * 9, alpha: .36 - depth * .28 };
  });
}

/** Chapter 3, open by design: a ring of parties around the same ground. */
function ring(): Pose[] {
  return Array.from({ length: FRAME_COUNT }, (_, index) => {
    const angle = (index / FRAME_COUNT) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(angle) * 6.4, y: Math.sin(angle) * 3.6, z: -4, rx: 0, ry: 0, scale: .45, alpha: .3 };
  });
}

/** Chapter 4, your part: every frame becomes the same one, an open canvas. */
function canvas(): Pose[] {
  return Array.from({ length: FRAME_COUNT }, () => ({ x: 0, y: .1, z: -3, rx: 0, ry: 0, scale: 1.7, alpha: .1 }));
}

function frameGeometry(): BufferGeometry {
  const radius = .18;
  const halfWidth = FRAME_WIDTH / 2;
  const halfHeight = FRAME_HEIGHT / 2;
  const points: Vector3[] = [];
  const corners = [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]];
  for (const [sx, sy, start] of corners) {
    for (let step = 0; step <= 8; step++) {
      const angle = start + (step / 8) * (Math.PI / 2);
      points.push(new Vector3(sx * (halfWidth - radius) + Math.cos(angle) * radius, sy * (halfHeight - radius) + Math.sin(angle) * radius, 0));
    }
  }
  points.push(points[0].clone());
  return new BufferGeometry().setFromPoints(points);
}

interface Frame { group: Group; line: Line; material: LineBasicMaterial; phase: number }

function createFrames(scene: Scene, geometry: BufferGeometry): Frame[] {
  const tint = new Color('#a070cf');
  return Array.from({ length: FRAME_COUNT }, () => {
    const material = new LineBasicMaterial({ color: tint, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const line = new Line(geometry, material);
    const group = new Group();
    group.add(line);
    scene.add(group);
    return { group, line, material, phase: Math.random() * Math.PI * 2 };
  });
}

function applyPoses(frames: Frame[], poses: Pose[]): void {
  frames.forEach((frame, index) => {
    const pose = poses[index];
    frame.group.position.set(pose.x, pose.y, pose.z);
    frame.group.rotation.set(pose.rx, pose.ry, 0);
    frame.group.scale.setScalar(pose.scale);
    frame.material.opacity = pose.alpha;
  });
}

/** Each section's arrival scrubs every frame from the previous figure to the next one. */
function bindChapters(frames: Frame[], chapters: Pose[][], sections: HTMLElement[], dim: number): ScrollTrigger[] {
  const triggers: ScrollTrigger[] = [];
  const tween = { duration: .65, ease: 'power2.inOut', immediateRender: false } as const;
  sections.slice(1).forEach((section, index) => {
    const from = chapters[index];
    const to = chapters[index + 1];
    const timeline = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 95%', end: 'top 15%', scrub: .9 } });
    frames.forEach((frame, position) => {
      const at = (position / FRAME_COUNT) * .35;
      const a = from[position];
      const b = to[position];
      timeline
        .fromTo(frame.group.position, { x: a.x, y: a.y, z: a.z }, { x: b.x, y: b.y, z: b.z, ...tween }, at)
        .fromTo(frame.group.rotation, { x: a.rx, y: a.ry }, { x: b.rx, y: b.ry, ...tween }, at)
        .fromTo(frame.group.scale, { x: a.scale, y: a.scale, z: a.scale }, { x: b.scale, y: b.scale, z: b.scale, ...tween }, at)
        .fromTo(frame.material, { opacity: a.alpha }, { opacity: b.alpha, ...tween, ease: 'none' }, at);
    });
    if (timeline.scrollTrigger) triggers.push(timeline.scrollTrigger);
  });
  // Inside the last chapter the single frame opens into the whole view.
  const last = sections.at(-1);
  if (last) {
    const opening = gsap.timeline({ scrollTrigger: { trigger: last, start: 'top 15%', end: 'bottom bottom', scrub: 1 } });
    frames.forEach(frame => {
      opening.fromTo(frame.group.scale, { x: 1.7, y: 1.7, z: 1.7 }, { x: 7, y: 7, z: 7, ease: 'power2.in', immediateRender: false }, 0)
        .fromTo(frame.material, { opacity: .1 * dim }, { opacity: .03 * dim, ease: 'none', immediateRender: false }, 0);
    });
    if (opening.scrollTrigger) triggers.push(opening.scrollTrigger);
  }
  return triggers;
}

/**
 * Mount the background scene and bind its chapter transitions to the page's sections.
 * @param sections The five scene sections in document order.
 * @returns Cleanup that disposes GPU resources and listeners.
 * @example const dispose = mountWorld([...document.querySelectorAll('main > section')]);
 */
export function mountWorld(sections: HTMLElement[]): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const element = document.createElement('canvas');
  element.className = 'world-canvas';
  element.setAttribute('aria-hidden', 'true');
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas: element, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    // Without a WebGL context the static figures stand on their own; there is nothing to clean up.
    return () => undefined;
  }
  document.body.prepend(element);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, .1, 80);
  camera.position.set(0, 0, 12);
  const geometry = frameGeometry();
  const frames = createFrames(scene, geometry);
  // Narrow viewports put every figure behind the text, so the field stays quieter there.
  const dim = matchMedia('(max-width: 760px)').matches ? .55 : 1;
  const chapters = [cloud(), wall(), corridor(), ring(), canvas()].map(poses => poses.map(pose => ({ ...pose, alpha: pose.alpha * dim })));
  applyPoses(frames, chapters[0]);
  const triggers = bindChapters(frames, chapters, sections, dim);

  // Pointer parallax on the camera; frames breathe on their own clock.
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  const onPointer = (event: PointerEvent) => {
    pointer.x = (event.clientX / innerWidth - .5) * 2;
    pointer.y = (event.clientY / innerHeight - .5) * 2;
  };
  if (matchMedia('(pointer: fine)').matches) window.addEventListener('pointermove', onPointer, { passive: true });
  const resize = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let handle = 0;
  let running = true;
  const render = (time: number) => {
    if (!running) return;
    eased.x += (pointer.x - eased.x) * .04;
    eased.y += (pointer.y - eased.y) * .04;
    camera.position.x = eased.x * .7;
    camera.position.y = -eased.y * .45;
    camera.lookAt(0, 0, -4);
    for (const frame of frames) frame.line.position.y = Math.sin(time / 2600 + frame.phase) * .09;
    renderer.render(scene, camera);
    handle = requestAnimationFrame(render);
  };
  const onVisibility = () => {
    running = document.visibilityState === 'visible';
    cancelAnimationFrame(handle);
    if (running) handle = requestAnimationFrame(render);
  };
  document.addEventListener('visibilitychange', onVisibility);
  handle = requestAnimationFrame(render);

  return () => {
    running = false;
    cancelAnimationFrame(handle);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    triggers.forEach(trigger => trigger.kill());
    frames.forEach(frame => frame.material.dispose());
    geometry.dispose();
    renderer.dispose();
    element.remove();
  };
}
