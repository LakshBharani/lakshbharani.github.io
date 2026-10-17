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
assert.equal(flightCurve({ x: 5, y: 10 }, { x: 105, y: 10 }), 'M5,10 C50,10 60,10 105,10');
assert.equal(flightCurve({ x: 5, y: 10 }, { x: 5, y: 110 }), 'M5,10 C5,55 5,65 5,110');
assert.equal(unwrapAngle(350, 10), 370);
assert.equal(unwrapAngle(10, 350), -10);
assert.equal(unwrapAngle(630, -90), 630);
assert.equal(unwrapAngle(-630, 90), -630);
console.log('PASS: flight clamping, reverse scroll, duplicate checkpoints, angle wrapping, and safe horizontal/vertical curves');

import { shouldShowIntro } from './dist/intro.mjs';
assert.equal(shouldShowIntro('', false), true);
assert.equal(shouldShowIntro('#', false), true);
assert.equal(shouldShowIntro('#work', false), false);
assert.equal(shouldShowIntro('', true), false);
const normalized = normalizeStops([{ x: 0, y: 0, scroll: 0 }, { x: 600, y: 0, scroll: 0 }, { x: 600, y: 0, scroll: 50 }], 60);
assert.equal(normalized.at(-1).scroll, 60);
assert.ok(normalized[1].scroll > 0 && normalized[1].scroll < normalized[2].scroll);
console.log('PASS: intro eligibility and strictly ordered flight checkpoints');
