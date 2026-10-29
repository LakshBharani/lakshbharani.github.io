import { setupIntro } from './intro.mjs?v=optional-intro';

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

export const REST_ANGLE = 18;
export function planePerch(anchor, scale) {
  // The keel tip (-7, 20), rather than the SVG box, touches the support.
  const radians = REST_ANGLE * Math.PI / 180;
  const x = (-7 * Math.cos(radians) - 20 * Math.sin(radians)) * .82 * scale;
  const y = (-7 * Math.sin(radians) + 20 * Math.cos(radians)) * .82 * scale;
  return { x: anchor.x - x, y: anchor.y - y };
}

function setupFlight() {
  const layer = document.querySelector('.flight-layer');
  const svg = layer.querySelector('svg');
  const geometry = layer.querySelector('#flight-geometry');
  const trail = layer.querySelector('#flight-trail');
  const marker = layer.querySelector('#flight-marker');
  const bearing = layer.querySelector('#flight-bearing');
  const restShadow = layer.querySelector('#flight-rest-shadow');
  const rows = [...document.querySelectorAll('.experience-row')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let stops = [], segments = [], docks = [], total = 0, frame = 0, mobile = false, lastAngle = REST_ANGLE, startAnchor, endAnchor;

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
    const footer = box('footer'), hero = box('.hero-kicker'), portrait = box('.portrait-wrap'), work = box('#work');
    const network = box('.network-visual');
    const pair = box('.project-pair');
    const infra = box('.infra-visual'), nux = box('.nux-visual');
    const experience = box('#experience'), research = box('.research');
    const about = box('#about'), contactBox = box('#contact');
    const paper = box('.paper'), writing = box('.writing'), infinity = box('.infinity');
    const paperTitle = box('.paper h3'), writingArt = box('.writing-graphic');
    const bio = box('.about-grid>div'), facts = box('.about-facts');
    const shell = box('.shell');
    const left = mobile ? width - 10 : Math.max(16, shell.left / 2);
    const right = width - left;
    const middle = pair.left + pair.width / 2;
    const maxScroll = Math.max(0, footer.bottom - height);
    const points = [];
    docks = [];
    const add = (x, y, scroll = y - height * .52) => points.push({ x, y, scroll: clamp(scroll, 0, maxScroll) });
    const scale = mobile ? .55 : .82;
    startAnchor = portrait.width
      ? { x: portrait.left + portrait.width / 2, y: portrait.top + 2 }
      : { x: hero.left + 68, y: hero.top + 2 };
    const launch = planePerch(startAnchor, scale);
    add(launch.x, launch.y, 0);
    if (!mobile) {
      add(right - 10, work.top - 120);
      add(width * .64, work.top + 18);
      add(left + 8, work.top + 62);
      add(left + 12, network.top + 30);
      add(network.left + network.width * .35, network.top + 112);
      add(network.right - 55, network.bottom - 115);
      add(middle - 30, pair.top + 32);
      add(infra.left + 60, infra.top + 115);
      add(middle, infra.bottom - 22);
      add(nux.right - 40, nux.top + 100);
      add(right - 6, pair.bottom - 30);
      add(width * .62, pair.bottom + 60);
      add(Math.max(8, shell.left - 30), experience.top + 60);
    } else {
      add(width - 12, network.top - 42);
      add(width * .6, network.top + 100);
      add(width - 32, network.bottom - 95);
      add(width - 12, infra.top - 30);
      add(width * .73, infra.top + 90);
      add(width - 12, infra.bottom + 50);
      add(width * .78, nux.top + 75);
      add(width - 12, nux.bottom + 75);
    }
    rows.forEach((row, i) => {
      const company = row.querySelector('.company').getBoundingClientRect();
      const heading = row.querySelector('.company h3').getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      const lane = mobile ? width - 8 : company.right - 28;
      if (!mobile && i === 0) {
        add(Math.max(8, shell.left - 30), bounds.top + scrollY - 24);
        add(lane, bounds.top + scrollY + 10);
      }
      add(lane, heading.top + scrollY + heading.height / 2);
      docks.push({ row, index: points.length - 1 });
      if (!mobile) add(lane - 14, bounds.bottom + scrollY - 30);
    });
    if (mobile && paper.right < writing.left) {
      add(width - 8, rows.at(-1).getBoundingClientRect().bottom + scrollY + 24);
    }
    if (paper.right < writing.left) {
      const seam = (paper.right + writing.left) / 2;
      add(left - 4, research.top + 50);
      add(left - 4, paper.top - 22);
      add(paper.right - 60, paper.top + 4);
      add(Math.max(paper.right - 100, infinity.right + 28), (infinity.top + infinity.bottom) / 2);
      add(seam - 28, paperTitle.top - 12);
      add(seam - Math.min(20, (writing.left - paper.right) / 2 + (mobile ? 6 : 12)), paper.bottom - 155);
      add(seam + 8, paper.bottom - 35);
      add(seam + 85, paper.bottom + 55);
    } else {
      add(width - 14, paper.top - 35);
      add(width - 12, paper.top + 65);
      add(paper.right - 54, infinity.top + 35);
      add(width - 14, paperTitle.top - 8);
      add(width - 12, paper.bottom - 75);
      add(width - 12, paper.bottom + 8);
      add(width * .62, (paper.bottom + writing.top) / 2);
      add(width - 12, writing.top + 8);
      add(writing.right - 26, writingArt.top - 25);
      add(width - 14, writingArt.bottom + 30);
      add(width - 12, writing.bottom - 75);
      add(width - 12, writing.bottom + 10);
      add(width * .68, writing.bottom + 32);
    }
    if (bio.right < facts.left) {
      const gap = (bio.right + facts.left) / 2;
      const sway = Math.max(0, Math.min(18, (facts.left - bio.right) / 2 - (mobile ? 18 : 26)));
      add(gap + sway * .55, bio.top + 10);
      add(gap - sway, bio.top + bio.height * .38);
      add(gap + sway, bio.top + bio.height * .72);
      add(gap - sway * .88, bio.bottom + 32);
      add(shell.left + shell.width * .42, about.bottom - 35);
    } else {
      add(width - 10, bio.top + 20);
      add(width - 10, bio.top + bio.height * .48);
      add(width - 10, bio.bottom - 25);
      add(width - 10, bio.bottom + 12);
      add(width * .57, facts.top + 10);
      add(width - 28, facts.top + 55);
      add(width - 10, facts.top + facts.height * .6);
      add(width - 12, facts.bottom + 8);
      add(width * .72, facts.bottom + 32);
    }
    if (!mobile) {
      add(width * .35, contactBox.top + 32);
      add(width * .75, contactBox.top + 58);
    }
    endAnchor = { x: footer.right - (mobile ? 24 : 40), y: footer.top };
    const perch = planePerch(endAnchor, scale);
    add(perch.x - (mobile ? 65 : 120), footer.top - 62, maxScroll - height * .2);
    add(perch.x, perch.y, maxScroll);

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
    const researchCloudSpace = paper.right - infinity.right;
    const researchCloudScale = researchCloudSpace >= 80 ? Math.min(.88, (researchCloudSpace - 32) / 110) : 0;
    const cloudPositions = [
      [mobile ? network.left + 76 : network.left + network.width * .28, network.top + (mobile ? 67 : 100), mobile ? .66 : .95],
      [(infinity.right + paper.right) / 2 + 6, infinity.top + infinity.height * .42, researchCloudScale]
    ];
    clouds.forEach((cloud, i) => {
      const [x, y, size] = cloudPositions[i];
      cloud.style.display = size ? '' : 'none';
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
    const eased = progress;
    const distance = segments[index].start + segments[index].length * eased;
    const p = pointAt(distance), before = pointAt(distance - 3), after = pointAt(distance + 3);
    let angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    const landing = !reduced.matches && index === segments.length - 1 ? eased : 0;
    if (index === 0) angle = REST_ANGLE + (unwrapAngle(REST_ANGLE, angle) - REST_ANGLE) * clamp(progress / .15, 0, 1);
    if (landing > 0) angle = angle * (1 - landing) + REST_ANGLE * landing;
    const parked = scroll <= 1 || landing > .995;
    if (parked) angle = REST_ANGLE;
    lastAngle = unwrapAngle(lastAngle, angle);
    const scale = mobile ? .55 : .82;
    marker.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${scale})`);
    const tangentBefore = pointAt(distance - 18), tangentAfter = pointAt(distance + 18);
    const incoming = Math.atan2(p.y - tangentBefore.y, p.x - tangentBefore.x) * 180 / Math.PI;
    const outgoing = Math.atan2(tangentAfter.y - p.y, tangentAfter.x - p.x) * 180 / Math.PI;
    const bank = parked ? 0 : (1 - landing) * clamp(unwrapAngle(incoming, outgoing) - incoming, -45, 45);
    bearing.style.transform = `rotate(${lastAngle}deg) scaleY(${1 - Math.abs(bank) / 180}) skewX(${bank * .12}deg)`;
    const anchor = scroll <= 1 ? startAnchor : endAnchor;
    restShadow.style.display = parked ? '' : 'none';
    restShadow.setAttribute('transform', `translate(${anchor.x} ${anchor.y + .5}) scale(${scale})`);
    bearing.classList.toggle('is-perched', parked);
    rows.forEach(row => row.classList.toggle('flight-docked', !reduced.matches && docks.some(d => d.row === row && scroll >= d.start && scroll <= d.finish)));
    const tail = [];
    for (let d = Math.max(0, distance - (mobile ? 75 : 160)); d <= distance; d += 5) {
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
