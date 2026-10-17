import { setupIntro } from './intro.mjs';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function flightSegment(stops, scroll) {
  if (stops.length < 2) return { index: 0, progress: 0 };
  let index = 0;
  while (index < stops.length - 2 && scroll >= stops[index + 1].scroll) index++;
  const span = stops[index + 1].scroll - stops[index].scroll;
  return { index, progress: span > 0 ? clamp((scroll - stops[index].scroll) / span, 0, 1) : 1 };
}

export function unwrapAngle(previous, angle) {
  return previous + (((angle - previous) % 360 + 540) % 360) - 180;
}

export function flightCurve(a, b, previous = a, next = b, width = Infinity) {
  // Shared tangents let adjacent curves meet without a corner.
  const tangent = (before, point, after) => {
    const dx = after.x - before.x, dy = after.y - before.y;
    const span = Math.hypot(dx, dy) || 1;
    const reach = Math.min(Math.hypot(point.x - before.x, point.y - before.y), Math.hypot(after.x - point.x, after.y - point.y)) * .4;
    const horizontal = Math.max(0, Math.min(point.x - 16, width - 16 - point.x));
    return { x: clamp(dx / span * reach, -horizontal, horizontal), y: dy / span * reach };
  };
  const incoming = previous === a ? { x: (b.x - a.x) / 3, y: (b.y - a.y) / 3 } : tangent(previous, a, b);
  const outgoing = next === b ? { x: (b.x - a.x) / 3, y: (b.y - a.y) / 3 } : tangent(a, b, next);
  return `M${a.x},${a.y} C${a.x + incoming.x},${a.y + incoming.y} ${b.x - outgoing.x},${b.y - outgoing.y} ${b.x},${b.y}`;
}

export function normalizeStops(points, maxScroll) {
  const stops = points.map(point => ({ ...point }));
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    const gap = Math.min(120, Math.max(1, Math.hypot(b.x - a.x, b.y - a.y) * .12));
    b.scroll = Math.max(a.scroll + gap, b.scroll);
  }
  const end = stops.at(-1).scroll;
  if (end > maxScroll) stops.forEach(stop => { stop.scroll *= maxScroll / end; });
  return stops;
}

function setupFlight() {
  const layer = document.querySelector('.flight-layer');
  const svg = layer.querySelector('svg');
  const geometry = layer.querySelector('#flight-geometry');
  const trail = layer.querySelector('#flight-trail');
  const marker = layer.querySelector('#flight-marker');
  const bearing = layer.querySelector('#flight-bearing');
  const forms = [...layer.querySelectorAll('.flight-form')];
  const contact = document.querySelector('.contact-arrow');
  const rows = [...document.querySelectorAll('.experience-row')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let stops = [], segments = [], docks = [], total = 0, frame = 0, mobile = false, lastAngle = -25, readable = [];

  const box = selector => {
    const r = document.querySelector(selector).getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY, width: r.width, height: r.height };
  };
  const pointAt = distance => {
    distance = clamp(distance, 0, total);
    const segment = segments.find(s => distance <= s.end) || segments.at(-1);
    return segment.path.getPointAtLength(clamp(distance - segment.start, 0, segment.length));
  };

  function measure() {
    const width = document.documentElement.clientWidth, height = innerHeight;
    mobile = width < 960;
    const footer = box('footer'), hero = box('.hero-kicker'), work = box('#work');
    const network = box('.network-visual');
    const pair = box('.project-pair');
    const infra = box('.infra-visual'), nux = box('.nux-visual');
    const experience = box('#experience'), research = box('.research');
    const about = box('#about'), end = box('.contact-arrow'), contactBox = box('#contact');
    const shell = box('.shell');
    const left = mobile ? width - 10 : Math.max(16, shell.left / 2);
    const right = width - left;
    const middle = pair.left + pair.width / 2;
    const maxScroll = Math.max(0, footer.bottom - height);
    const points = [];
    docks = [];
    const add = (x, y, scroll = y - height * .52, form = 'plane') => points.push({ x, y, scroll: clamp(scroll, 0, maxScroll), form });
    const hold = (x, y, form = 'plane', row = null) => {
      add(x, y, y - height * .52, form);
      if (row) docks.push({ row, index: points.length - 1 });
    };


    add(mobile ? width - 26 : shell.right - 80, hero.top + hero.height / 2, 0);
    if (!mobile) {
      add(right - 10, work.top - 120);
      add(width * .64, work.top + 18);
      add(left + 8, work.top + 62);
      add(left + 12, network.top + 30);
      add(network.left + network.width * .35, network.top + 112);
      hold(network.right - 55, network.bottom - 115, 'packet');
      add(middle - 30, pair.top + 32);
      hold(infra.left + 60, infra.top + 115, 'cloud');
      add(middle, infra.bottom - 22);
      hold(nux.right - 40, nux.top + 100, 'terminal');
      add(right - 6, pair.bottom - 30);
      add(width * .62, pair.bottom + 60);
      add(left + 12, experience.top + 60);
    } else {
      add(width - 12, network.top - 42);
      add(width * .6, network.top + 100);
      hold(width - 32, network.bottom - 95, 'packet');
      add(width - 12, infra.top - 30);
      hold(width * .73, infra.top + 90, 'cloud');
      add(width - 12, infra.bottom + 50);
      hold(width * .78, nux.top + 75, 'terminal');
      add(width - 12, nux.bottom + 75);
    }
    rows.forEach((row, i) => {
      const r = row.querySelector('.company').getBoundingClientRect();
      const y = r.top + scrollY;
      hold(mobile ? width - 15 : left + 10, y + 20, 'plane', row);
      if (!mobile) add(shell.left + 105 + i * 12, y + 125);
    });
    if (mobile) {
      hold(width - 28, research.top + 48, 'infinity');
      add(width - 12, about.top + 50);
    } else {
      add(left + 15, research.top - 20);
      add(width * .32, research.top + 36);
      add(width * .64, research.top + 62);
      add(right - 24, research.top + 32);
      add(right - 12, about.top - 35);
      add(width * .67, about.top + 45);
      add(left + 18, about.top + 65);
    }
    add(mobile ? width - 15 : left + 12, about.bottom - 30);
    if (!mobile) {
      add(width * .35, contactBox.top + 32);
      add(width * .75, contactBox.top + 58);
    }
    add(mobile ? width - 20 : right - 30, end.top - 50, maxScroll - height * .2);
    add(end.left + end.width / 2, end.top + end.height / 2, maxScroll);

    stops = normalizeStops(points, maxScroll);
    docks.forEach(dock => { dock.start = stops[dock.index].scroll - 55; dock.finish = stops[dock.index].scroll + 55; });
    geometry.replaceChildren(); total = 0;
    segments = stops.slice(1).map((b, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', flightCurve(stops[index], b, stops[index - 1] || stops[index], stops[index + 2] || b, width)); geometry.append(path);
      const length = path.getTotalLength(), start = total;
      total += length;
      return { path, length, start, end: total };
    });
    svg.setAttribute('viewBox', `0 0 ${width} ${Math.ceil(footer.bottom)}`);
    layer.style.height = `${Math.ceil(footer.bottom)}px`;
    const clouds = layer.querySelectorAll('.flight-cloud');
    const cloudPositions = mobile
      ? [[width - 14, work.top + 25, .43], [width - 14, experience.top + 27, 0], [width - 14, contactBox.top + 23, .35]]
      : [[width * .66, work.top + 46, 1], [width * .54, experience.top + 43, .78], [width * .62, contactBox.top + 44, .88]];
    clouds.forEach((cloud, i) => {
      const [x, y, size] = cloudPositions[i];
      cloud.setAttribute('transform', `translate(${x} ${y}) scale(${size})`);
    });
    readable = [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main a, .tags, .visual-top, .visual-bottom, .terminal-body, .routes>span, .flow-main, .intent')].map(element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY };
    });
    layer.hidden = false;
    render();
  }

  function render() {
    frame = 0;
    if (!segments.length) return;
    const scroll = reduced.matches ? 0 : scrollY;
    const { index, progress } = flightSegment(stops, scroll);
    const eased = progress;
    const distance = segments[index].start + segments[index].length * eased;
    const p = pointAt(distance), before = pointAt(distance - 3), after = pointAt(distance + 3);
    let angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    const landing = !reduced.matches && index === segments.length - 1 ? eased : 0;
    if (scroll <= 1) angle = -25;
    if (landing > 0) angle = angle * (1 - landing) - 25 * landing;
    lastAngle = unwrapAngle(lastAngle, angle);
    const scale = (mobile ? .65 : 1.05) + landing * (mobile ? .5 : .6);
    marker.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scale})`);
    const tangentBefore = pointAt(distance - 18), tangentAfter = pointAt(distance + 18);
    const incoming = Math.atan2(p.y - tangentBefore.y, p.x - tangentBefore.x) * 180 / Math.PI;
    const outgoing = Math.atan2(tangentAfter.y - p.y, tangentAfter.x - p.x) * 180 / Math.PI;
    const bank = clamp(unwrapAngle(incoming, outgoing) - incoming, -45, 45);
    bearing.style.transform = `rotate(${lastAngle}deg) scaleY(${1 - Math.abs(bank) / 180}) skewX(${bank * .12}deg)`;
    const obscuresText = readable.some(r => p.x + 24 > r.left && p.x - 24 < r.right && p.y + 17 > r.top && p.y - 17 < r.bottom);
    marker.style.opacity = obscuresText && landing < .8 ? '.18' : '1';
    const checkpoint = stops.find(stop => stop.form !== 'plane' && Math.abs(scroll - stop.scroll) < 70);
    const form = checkpoint?.form || 'plane';
    forms.forEach(shape => shape.classList.toggle('is-current', shape.dataset.form === form));
    contact.style.setProperty('--plane-landing', landing.toFixed(3));
    rows.forEach(row => row.classList.toggle('flight-docked', !reduced.matches && docks.some(d => d.row === row && scroll >= d.start && scroll <= d.finish)));
    const tail = [];
    for (let d = Math.max(0, distance - (mobile ? 75 : 160)); d <= distance; d += 5) {
      const point = pointAt(d); tail.push(`${tail.length ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`);
    }
    trail.style.opacity = obscuresText ? '.08' : '.22';
    trail.setAttribute('d', reduced.matches || landing > .95 ? '' : tail.join(' '));
  }

  const schedule = () => { if (!frame && !reduced.matches) frame = requestAnimationFrame(render); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure);
  reduced.addEventListener('change', measure);
  new ResizeObserver(measure).observe(document.querySelector('main'));
  document.fonts.ready.then(measure);
  measure();
}

if (typeof document !== 'undefined' && document.querySelector('.flight-layer')) {
  setupFlight();
  setupIntro();
}
