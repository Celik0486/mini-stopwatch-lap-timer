# mini-stopwatch-lap-timer

Records lap splits and cumulative elapsed time for a monotonic stopwatch. Uses `performance.now` by default; pass your own clock function for deterministic tests.

```js
import { Stopwatch } from 'mini-stopwatch-lap-timer';

const sw = new Stopwatch(); // optional: pass a () => number clock
sw.start();
sw.split(); // { split, cumulative }
sw.stop();   // returns elapsed ms
sw.elapsed();
sw.laps();   // array of { split, cumulative }
sw.reset();
```

## Why

I needed a stopwatch that recorded per-lap split deltas alongside cumulative elapsed time, with no dependencies and a clock I could swap out for tests. The trade-off: elapsed time is recomputed from the start anchor on every read rather than accumulated, so a clock that jumps produces one bad reading instead of permanently corrupting all future ones.

## Edge cases

- `start()` on a running stopwatch throws. Silent re-anchoring would discard elapsed time and hide caller bugs.
- `stop()` is idempotent — a second call returns the frozen reading without re-reading the clock.
- `split()` only works while running; it throws if stopped or never started.
- `reset()` clears laps too. Per-stop segment totals are not modeled here; derive them from the lap list if you need them.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

