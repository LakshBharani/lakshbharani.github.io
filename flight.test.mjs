import assert from 'node:assert/strict';
import { clamp, flightSegment, flightCurve, unwrapAngle, normalizeStops, planePerch, REST_ANGLE } from './dist/flight.mjs';
const stops = [{ scroll: 0 }, { scroll: 100 }, { scroll: 100 }, { scroll: 300 }];
assert.deepEqual(flightSegment(stops, -20), { index: 0, progress: 0 });
assert.deepEqual(flightSegment(stops, 50), { index: 0, progress: .5 });
assert.deepEqual(flightSegment(stops, 100), { index: 2, progress: 0 });
assert.deepEqual(flightSegment(stops, 200), { index: 2, progress: .5 });
assert.deepEqual(flightSegment(stops, 900), { index: 2, progress: 1 });
assert.deepEqual(flightSegment(stops, 50), { index: 0, progress: .5 }); // Reverse scroll retraces the same position.
assert.equal(clamp(2, 0, 1), 1);
const a = { x: 0, y: 0 }, b = { x: 120, y: 60 }, c = { x: 180, y: 240 }, d = { x: 80, y: 360 };
const controls = path => path.split(/[MC ,]/).filter(Boolean).map(Number);
const first = controls(flightCurve(a, b, a, c));
const second = controls(flightCurve(b, c, a, d));
assert.ok(Math.abs((first[6] - first[4]) - (second[2] - second[0])) < 1e-10);
assert.ok(Math.abs((first[7] - first[5]) - (second[3] - second[1])) < 1e-10);
assert.ok(first.every(Number.isFinite));
assert.equal(flightCurve(a, a), 'M0,0 C0,0 0,0 0,0');
assert.equal(unwrapAngle(350, 10), 370);
assert.equal(unwrapAngle(10, 350), -10);
assert.equal(unwrapAngle(630, -90), 630);
assert.equal(unwrapAngle(-630, 90), -630);
console.log('PASS: flight clamping, reverse scroll, duplicate checkpoints, angle wrapping, and continuous curved tangents');

import { setupIntro } from './dist/intro.mjs';
const element = () => ({ hidden: true, disabled: false, events: {},
  addEventListener(name, handler) { this.events[name] = handler; }, focus() {} });
const start = element(), skip = element(), replay = element();
let shows = 0, closes = 0;
const dialog = { ...element(), classList: { remove() {} },
  showModal() { shows++; this.open = true; }, close() { closes++; this.open = false; },
  querySelector(selector) { return selector === '.intro-start' ? start : selector === '.intro-skip' ? skip : {}; } };
globalThis.document = { querySelector(selector) { return selector === '#flight-intro' ? dialog : selector === '.intro-replay' ? replay : start; },
  documentElement: { classList: { add() {}, remove() {} } } };
globalThis.matchMedia = () => ({ matches: true, addEventListener() {} });
globalThis.scrollTo = () => {};
setupIntro();
assert.equal(shows, 0, 'A fresh visit must show the portfolio without a modal');
assert.equal(replay.hidden, false, 'The optional intro remains discoverable');
replay.events.click();
assert.equal(shows, 1, 'The intro opens only after an explicit click');
await start.events.click();
assert.equal(closes, 1, 'Reduced motion enters directly without the folding animation');
replay.events.click();
skip.events.click();
assert.equal(closes, 2, 'Skip returns to the portfolio');
replay.events.click();
let prevented = false;
dialog.events.cancel({ preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(closes, 3, 'Escape returns to the portfolio');
delete globalThis.document;
delete globalThis.matchMedia;
delete globalThis.scrollTo;
const normalized = normalizeStops([{ x: 0, y: 0, scroll: 0 }, { x: 600, y: 0, scroll: 0 }, { x: 600, y: 0, scroll: 50 }], 60);
assert.equal(normalized.at(-1).scroll, 60);
assert.ok(normalized[1].scroll > 0 && normalized[1].scroll < normalized[2].scroll);
console.log('PASS: optional intro controls and strictly ordered flight checkpoints');

const edge = controls(flightCurve({ x: 36, y: 100 }, { x: 40, y: 400 }, { x: 1100, y: 60 }, { x: 300, y: 500 }, 1280));
assert.ok(edge.filter((_, i) => i % 2 === 0).every(x => x >= 16 && x <= 1264));

for (const scale of [.55, .82]) {
  const anchor = { x: 320, y: 600 };
  const origin = planePerch(anchor, scale), angle = REST_ANGLE * Math.PI / 180;
  const contact = { x: origin.x + (-7 * Math.cos(angle) - 20 * Math.sin(angle)) * .82 * scale,
    y: origin.y + (-7 * Math.sin(angle) + 20 * Math.cos(angle)) * .82 * scale };
  assert.ok(Math.abs(contact.x - anchor.x) < 1e-10 && Math.abs(contact.y - anchor.y) < 1e-10);
}
console.log('PASS: folded keel touches its support at desktop and mobile scale');
