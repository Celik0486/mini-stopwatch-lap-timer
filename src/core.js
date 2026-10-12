/**
 * Monotonic stopwatch with lap splits and cumulative elapsed time.
 *
 * WHY performance.now is not hardcoded: the clock is injected so tests can be
 * fully deterministic. Wall-clock comparisons are forbidden in the test
 * suite; passing a fake clock is the only way to keep that contract honest.
 *
 * WHY elapsed is computed from (now - anchor) on every read instead of being
 * accumulated: a monotonic clock can't be reliably added to — if the caller
 * hands us a clock that jumps (even though they shouldn't), accumulation
 * would bake the jump in permanently. Reading from the anchor each time makes
 * a jump visible as a single bad reading rather than corrupting all future
 * readings.
 *
 * Single interpretation chosen: a stop preserves the reading at the moment of
 * stop. Calling stop() twice does nothing the second time — the stopwatch does
 * not accumulate across stop/start cycles. reset() clears everything including
 * laps. If you need per-stop segment totals, compute them from the lap list
 * yourself; that is not what this object models.
 */

export class Stopwatch {
  #clock;
  #anchor = null;   // timestamp captured at start; null means stopped
  #stopTime = null;  // timestamp captured at stop; null means running
  #laps = [];

  /**
   * @param {() => number} [clock] - monotonic time source in ms, defaults to
   *   performance.now. Inject a fake in tests.
   */
  constructor(clock) {
    this.#clock = typeof clock === 'function' ? clock : () => performance.now();
  }

  /**
   * Start the stopwatch. If already running, this is a no-op — starting an
   * already-running stopwatch would silently re-anchor and discard elapsed
   * time, which is almost certainly a caller bug. Fail loudly instead.
   *
   * @returns {void}
   * @throws {Error} if the stopwatch is already running.
   */
  start() {
    if (this.#anchor !== null && this.#stopTime === null) {
      throw new Error('Stopwatch is already running');
    }
    this.#anchor = this.#clock();
    this.#stopTime = null;
  }

  /**
   * Stop the stopwatch and freeze the reading. A second stop is a no-op so
   * callers don't have to guard against double-stop.
   *
   * @returns {number} elapsed time in ms at the moment of stop.
   */
  stop() {
    if (this.#anchor === null || this.#stopTime !== null) {
      return this.elapsed();
    }
    this.#stopTime = this.#clock();
    return this.#stopTime - this.#anchor;
  }

  /**
   * Reset to the initial state: stopped, zero elapsed, no laps. Safe to call
   * whether running or stopped.
   *
   * @returns {void}
   */
  reset() {
    this.#anchor = null;
    this.#stopTime = null;
    this.#laps = [];
  }

  /**
   * Record a lap split. The split value is the delta between the previous lap
   * (or start) and now. The cumulative reading is also stored so callers can
   * reconstruct the timeline without re-deriving it.
   *
   * @returns {{split: number, cumulative: number}} the new lap record.
   * @throws {Error} if the stopwatch is not running.
   */
  split() {
    if (this.#anchor === null || this.#stopTime !== null) {
      throw new Error('Stopwatch is not running');
    }
    const now = this.#clock();
    const cumulative = now - this.#anchor;
    const previous = this.#laps.length > 0
      ? this.#laps[this.#laps.length - 1].cumulative
      : 0;
    const lap = { split: cumulative - previous, cumulative };
    this.#laps.push(lap);
    return lap;
  }

  /**
   * @returns {number} elapsed ms. If stopped, returns the frozen reading.
   *   If never started, returns 0.
   */
  elapsed() {
    if (this.#anchor === null) {
      return 0;
    }
    if (this.#stopTime !== null) {
      return this.#stopTime - this.#anchor;
    }
    return this.#clock() - this.#anchor;
  }

  /**
   * @returns {boolean} true if the stopwatch is running (started and not
   *   stopped).
   */
  isRunning() {
    return this.#anchor !== null && this.#stopTime === null;
  }

  /**
   * @returns {Array<{split: number, cumulative: number}>} a shallow copy of
   *   the lap list. Mutating it does not affect the stopwatch.
   */
  laps() {
    return this.#laps.slice();
  }
}
