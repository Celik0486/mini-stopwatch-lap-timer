import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stopwatch } from '../src/index.js';

// Deterministic fake clock. Each call to now() returns the next value from
// ticks. This keeps tests free of wall-clock comparisons and sleeps.
function fakeClock(ticks) {
  let i = 0;
  return () => {
    const v = ticks[i];
    i += 1;
    return v;
  };
}

test('elapsed is zero before start', () => {
  const sw = new Stopwatch(fakeClock([0]));
  assert.equal(sw.elapsed(), 0);
  assert.equal(sw.isRunning(), false);
});

test('start anchors at the clock value and elapsed reflects current clock', () => {
  const sw = new Stopwatch(fakeClock([10, 25]));
  sw.start();
  assert.equal(sw.isRunning(), true);
  assert.equal(sw.elapsed(), 15);
});

test('stop freezes the reading at the moment of stop', () => {
  const sw = new Stopwatch(fakeClock([0, 50, 999]));
  sw.start();
  const stopped = sw.stop();
  assert.equal(stopped, 50);
  assert.equal(sw.elapsed(), 50);
  assert.equal(sw.isRunning(), false);
  // further clock calls do not change the reading
  assert.equal(sw.elapsed(), 50);
});

test('double stop is a no-op returning the frozen reading', () => {
  const sw = new Stopwatch(fakeClock([0, 30, 40]));
  sw.start();
  const first = sw.stop();
  const second = sw.stop();
  assert.equal(first, 30);
  assert.equal(second, 30);
  assert.equal(sw.elapsed(), 30);
});

test('start while running throws', () => {
  const sw = new Stopwatch(fakeClock([0]));
  sw.start();
  assert.throws(() => sw.start(), /already running/i);
});

test('reset returns to the initial state and clears laps', () => {
  const sw = new Stopwatch(fakeClock([0, 10, 20, 30]));
  sw.start();
  sw.split();
  sw.stop();
  assert.equal(sw.laps().length, 1);
  sw.reset();
  assert.equal(sw.elapsed(), 0);
  assert.equal(sw.isRunning(), false);
  assert.equal(sw.laps().length, 0);
});

test('stop on a never-started stopwatch returns 0 without error', () => {
  const sw = new Stopwatch(fakeClock([]));
  const result = sw.stop();
  assert.equal(result, 0);
  assert.equal(sw.isRunning(), false);
});

test('split records delta from previous lap and cumulative from start', () => {
  const sw = new Stopwatch(fakeClock([0, 10, 30, 60]));
  sw.start(); // anchor=0
  const lap1 = sw.split(); // now=10 -> split 10, cumulative 10
  const lap2 = sw.split(); // now=30 -> split 20, cumulative 30
  const lap3 = sw.split(); // now=60 -> split 30, cumulative 60
  assert.equal(lap1.split, 10);
  assert.equal(lap1.cumulative, 10);
  assert.equal(lap2.split, 20);
  assert.equal(lap2.cumulative, 30);
  assert.equal(lap3.split, 30);
  assert.equal(lap3.cumulative, 60);
  assert.equal(sw.laps().length, 3);
});

test('split throws when stopped', () => {
  const sw = new Stopwatch(fakeClock([0, 10]));
  sw.start();
  sw.stop();
  assert.throws(() => sw.split(), /not running/i);
});

test('split throws when never started', () => {
  const sw = new Stopwatch(fakeClock([]));
  assert.throws(() => sw.split(), /not running/i);
});

test('laps returns a copy that does not mutate internal state', () => {
  const sw = new Stopwatch(fakeClock([0, 5, 12]));
  sw.start();
  sw.split();
  const snapshot = sw.laps();
  snapshot.push({ split: 999, cumulative: 999 });
  assert.equal(sw.laps().length, 1);
});

test('default clock is performance.now and produces a non-negative reading', () => {
  const sw = new Stopwatch();
  sw.start();
  const e = sw.elapsed();
  assert.ok(typeof e === 'number');
  assert.ok(e >= 0);
  sw.stop();
});
