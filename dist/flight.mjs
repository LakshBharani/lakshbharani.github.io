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

export function flightCurve(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.abs(dx) > Math.abs(dy)
    ? `M${a.x},${a.y} C${a.x + dx * .45},${a.y} ${b.x - dx * .45},${b.y} ${b.x},${b.y}`
    : `M${a.x},${a.y} C${a.x},${a.y + dy * .45} ${b.x},${b.y - dy * .45} ${b.x},${b.y}`;
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
  let stops = [], segments = [], docks = [], total = 0, frame = 0, mobile = false, lastAngle = -25, rollStart = 0, rollEnd = 0;

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
    const featured = box('.featured'), pair = box('.project-pair');
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
      const start = y - height * .59, finish = y - height * .43;
      add(x, y, start, form); add(x, y, finish, form);
      if (row) docks.push({ row, first: points.length - 2, last: points.length - 1 });
    };
    const cross = (from, to, y) => {
      add(from, y, y - height * .75);
      add(to, y, y - height * .3);
    };

    add(mobile ? width - 8 : shell.right - 36, hero.top + hero.height / 2, 0);
    if (!mobile) {
      add(right, work.top - 24);
      cross(right, left, work.top + 46);
      add(left, network.top + 92);
      add(network.right - 42, network.top + 92);
      hold(network.right - 42, network.bottom - 92, 'packet');
      add(network.right - 42, featured.bottom + 12);
      add(middle, pair.top - 12);
    } else hold(left, featured.top + featured.height * .42, 'packet');
    hold(mobile ? left : middle, infra.top + infra.height * .46, 'cloud');
    // Side-by-side cards share a gutter; the two stops use different heights.
    hold(mobile ? left : middle, mobile ? nux.top + nux.height * .46 : infra.top + infra.height + 90, 'terminal');
    if (!mobile) cross(middle, left, pair.bottom + 20);
    rows.forEach(row => {
      const r = row.querySelector('.company').getBoundingClientRect();
      hold(left, r.top + scrollY + Math.min(r.height / 2, 25), 'plane', row);
    });
    rollStart = points.length;
    if (mobile) {
      hold(left, research.top + 28, 'infinity');
    } else {
      const y = research.top + 48, x = research.left + 88;
      const start = y - height * .78, duration = height * .52;
      add(left, y, start);
      [[x, y], [x + 32, y - 15], [x + 54, y], [x + 32, y + 15], [x, y], [x - 32, y - 15], [x - 54, y], [x - 32, y + 15], [x, y], [left, y]].forEach(([px, py], i) => add(px, py, start + duration * (i + 1) / 10));
    }
    rollEnd = points.length - 1;
    hold(left, about.top + about.height * .45);
    if (!mobile) cross(left, right, contactBox.top + 44);
    add(mobile ? left : right, end.top - 34, maxScroll - height * .22);
    add(end.left + end.width / 2, end.top + end.height / 2, maxScroll);

    stops = normalizeStops(points, maxScroll);
    docks.forEach(dock => { dock.start = stops[dock.first].scroll; dock.finish = stops[dock.last].scroll; });
    rollStart = stops[rollStart].scroll;
    rollEnd = stops[rollEnd].scroll;
    geometry.replaceChildren(); total = 0;
    segments = stops.slice(1).map((b, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', flightCurve(stops[index], b)); geometry.append(path);
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
    layer.hidden = false;
    render();
  }

  function render() {
    frame = 0;
    if (!segments.length) return;
    const scroll = reduced.matches ? 0 : scrollY;
    const { index, progress } = flightSegment(stops, scroll);
    const a = stops[index], b = stops[index + 1];
    const eased = progress * progress * (3 - 2 * progress);
    const distance = segments[index].start + segments[index].length * eased;
    const p = pointAt(distance), before = pointAt(distance - 3), after = pointAt(distance + 3);
    let angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    const landing = !reduced.matches && index === segments.length - 1 ? eased : 0;
    if (scroll <= 1) angle = -25;
    if (landing > 0) angle = angle * (1 - landing) - 25 * landing;
    lastAngle = unwrapAngle(lastAngle, angle);
    const scale = (mobile ? .5 : .9) + landing * (mobile ? .5 : .6);
    marker.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scale})`);
    const tangentBefore = pointAt(distance - 18), tangentAfter = pointAt(distance + 18);
    const incoming = Math.atan2(p.y - tangentBefore.y, p.x - tangentBefore.x) * 180 / Math.PI;
    const outgoing = Math.atan2(tangentAfter.y - p.y, tangentAfter.x - p.x) * 180 / Math.PI;
    const bank = clamp(unwrapAngle(incoming, outgoing) - incoming, -45, 45);
    const roll = !mobile && !reduced.matches ? clamp((scroll - rollStart) / Math.max(1, rollEnd - rollStart), 0, 1) : 0;
    const tilt = Math.cos(roll * Math.PI * 2) * (1 - Math.abs(bank) / 110);
    bearing.style.transform = `rotate(${lastAngle}deg) scaleY(${tilt}) skewX(${bank * .18}deg)`;
    let form = 'plane';
    if (a.form === b.form) form = a.form;
    else if (a.form !== 'plane' && progress < .18) form = a.form;
    else if (b.form !== 'plane' && progress > .82) form = b.form;
    forms.forEach(shape => shape.classList.toggle('is-current', shape.dataset.form === form));
    contact.style.setProperty('--plane-landing', landing.toFixed(3));
    rows.forEach(row => row.classList.toggle('flight-docked', !reduced.matches && docks.some(d => d.row === row && scroll >= d.start && scroll <= d.finish)));
    const tail = [];
    for (let d = Math.max(0, distance - (mobile ? 42 : 92)); d <= distance; d += 5) {
      const point = pointAt(d); tail.push(`${tail.length ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`);
    }
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
