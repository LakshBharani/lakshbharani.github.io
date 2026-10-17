import assert from 'node:assert/strict';
import { clamp, flightSegment, flightCurve, unwrapAngle, normalizeStops } from './dist/flight.mjs';
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

import { shouldShowIntro } from './dist/intro.mjs';
assert.equal(shouldShowIntro('', false), true);
assert.equal(shouldShowIntro('#', false), true);
assert.equal(shouldShowIntro('#work', false), false);
assert.equal(shouldShowIntro('', true), false);
const normalized = normalizeStops([{ x: 0, y: 0, scroll: 0 }, { x: 600, y: 0, scroll: 0 }, { x: 600, y: 0, scroll: 50 }], 60);
assert.equal(normalized.at(-1).scroll, 60);
assert.ok(normalized[1].scroll > 0 && normalized[1].scroll < normalized[2].scroll);
console.log('PASS: intro eligibility and strictly ordered flight checkpoints');

const edge = controls(flightCurve({ x: 36, y: 100 }, { x: 40, y: 400 }, { x: 1100, y: 60 }, { x: 300, y: 500 }, 1280));
assert.ok(edge.filter((_, i) => i % 2 === 0).every(x => x >= 16 && x <= 1264));
