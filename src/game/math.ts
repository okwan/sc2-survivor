/** Length of (x, y). Math.hypot is slow and allocates in V8's hot loops; this doesn't. */
export function hyp(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/** Frame-rate independent smoothing: the fraction to move this frame for decay rate `rate` per second. */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}
